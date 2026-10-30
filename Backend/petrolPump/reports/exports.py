from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _num(value, places=2):
    if value is None:
        return '-'
    return f'{Decimal(str(value)):,.{places}f}'


def _table(rows, widths, right_cols=()):
    table = Table(rows, colWidths=widths, repeatRows=1)
    style = [
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8EEF4')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ]
    for col in right_cols:
        style.append(('ALIGN', (col, 0), (col, -1), 'RIGHT'))
    table.setStyle(TableStyle(style))
    return table


def build_pdf(report):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm, title=f"Monthly report {report['period']}",
    )
    styles = getSampleStyleSheet()
    totals = report['totals']
    salary_label = 'Salaries (estimate)' if totals['salaries_is_estimate'] else 'Salaries'

    story = [
        Paragraph(f"Petrol Pump - Monthly Report {escape(report['period'])}", styles['Title']),
        Paragraph(f"{report['date_from']} to {report['date_to']}", styles['Normal']),
        Spacer(1, 6 * mm),
        Paragraph('Summary (Rs)', styles['Heading2']),
        _table([
            ['Item', 'Amount'],
            ['Sales', _num(totals['sales'])],
            ['Fuel purchases', _num(totals['purchases'])],
            ['Expenses', _num(totals['expenses'])],
            [salary_label, _num(totals['salaries'])],
            ['Profit / (Loss)', _num(totals['profit'])],
        ], [90 * mm, 50 * mm], right_cols=(1,)),
        Spacer(1, 5 * mm),
        Paragraph('Sales by fuel type', styles['Heading2']),
    ]

    fuel_rows = [['Fuel', 'Litres', 'Amount', 'Avg rate', 'Cost/L', 'Margin/L']]
    for row in report['by_fuel']:
        fuel_rows.append([
            row['label'], _num(row['litres']), _num(row['amount']), _num(row['avg_rate']),
            _num(row['cost_per_litre']), _num(row['margin_per_litre']),
        ])
    story.append(_table(fuel_rows, [32 * mm, 28 * mm, 32 * mm, 25 * mm, 25 * mm, 25 * mm],
                        right_cols=(1, 2, 3, 4, 5)))

    story += [Spacer(1, 5 * mm), Paragraph('Sales by nozzle', styles['Heading2'])]
    nozzle_rows = [['Nozzle', 'Fuel', 'Litres', 'Amount']]
    for row in report['by_nozzle']:
        nozzle_rows.append([row['name'], row['label'], _num(row['litres']), _num(row['amount'])])
    story.append(_table(nozzle_rows, [50 * mm, 40 * mm, 35 * mm, 40 * mm], right_cols=(2, 3)))

    story += [Spacer(1, 5 * mm), Paragraph('Expenses by category', styles['Heading2'])]
    expense_rows = [['Category', 'Amount']]
    for row in report['expenses']['by_category']:
        expense_rows.append([row['label'], _num(row['total'])])
    if len(expense_rows) == 1:
        expense_rows.append(['-', '-'])
    story.append(_table(expense_rows, [90 * mm, 50 * mm], right_cols=(1,)))

    purchases = report['purchases']
    story += [
        Spacer(1, 5 * mm),
        Paragraph('Fuel deliveries', styles['Heading2']),
        _table([
            ['Deliveries', 'Invoiced L', 'Received L', 'Shortage L', 'Cost'],
            [str(purchases['count']), _num(purchases['litres_invoiced']), _num(purchases['litres_received']),
             _num(purchases['shortage_litres']), _num(purchases['cost'])],
        ], [28 * mm, 33 * mm, 33 * mm, 33 * mm, 38 * mm], right_cols=(1, 2, 3, 4)),
    ]
    doc.build(story)
    return buffer.getvalue()


HEADER_FONT = Font(bold=True)
HEADER_FILL = PatternFill('solid', fgColor='E8EEF4')


def _safe(value):
    """Excel mein '=', '+', '-', '@' se shuru hone wala text formula na ban jaye."""
    text = str(value)
    return "'" + text if text[:1] in ('=', '+', '-', '@') else text


def _cell(value):
    if isinstance(value, str):
        return _safe(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


def _fill_sheet(ws, header, rows, number_cols=()):
    ws.append(header)
    for cell in ws[1]:
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
    for row in rows:
        ws.append([_cell(value) for value in row])
    for col in number_cols:
        for cell in ws[get_column_letter(col)][1:]:
            cell.number_format = '#,##0.00'
    for index in range(1, len(header) + 1):
        ws.column_dimensions[get_column_letter(index)].width = 18


def build_xlsx(report):
    workbook = Workbook()
    totals = report['totals']

    summary = workbook.active
    summary.title = 'Summary'
    _fill_sheet(summary, ['Item', 'Value'], [
        ['Period', report['period']],
        ['Sales', totals['sales']],
        ['Litres sold', totals['litres']],
        ['Fuel purchases', totals['purchases']],
        ['Expenses', totals['expenses']],
        ['Salaries (estimate)' if totals['salaries_is_estimate'] else 'Salaries', totals['salaries']],
        ['Profit / (Loss)', totals['profit']],
    ], number_cols=(2,))

    _fill_sheet(workbook.create_sheet('By fuel'),
                ['Fuel', 'Litres', 'Amount', 'Avg rate', 'Cost per litre', 'Margin per litre'],
                [[r['label'], r['litres'], r['amount'], r['avg_rate'], r['cost_per_litre'],
                  r['margin_per_litre']] for r in report['by_fuel']],
                number_cols=(2, 3, 4, 5, 6))
    _fill_sheet(workbook.create_sheet('By nozzle'),
                ['Nozzle', 'Fuel', 'Litres', 'Amount'],
                [[r['name'], r['label'], r['litres'], r['amount']] for r in report['by_nozzle']],
                number_cols=(3, 4))
    _fill_sheet(workbook.create_sheet('Daily'),
                ['Date', 'Litres', 'Amount', 'Entries'],
                [[r['period'], r['litres'], r['amount'], r['entries']] for r in report['daily']],
                number_cols=(2, 3))
    _fill_sheet(workbook.create_sheet('Expenses'),
                ['Category', 'Amount'],
                [[r['label'], r['total']] for r in report['expenses']['by_category']],
                number_cols=(2,))

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()