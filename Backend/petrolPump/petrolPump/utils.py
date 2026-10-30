from datetime import datetime, time

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

def int_param(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    if not raw.isdecimal():
        raise ValidationError({name: 'Sahi number dein.'})
    return int(raw)


def parse_date_or_error(name, raw):
    try:
        parsed = parse_date(raw)
    except ValueError:
        parsed = None
    if parsed is None:
        raise ValidationError({name: 'Date YYYY-MM-DD format mein dein.'})
    return parsed


def date_param(request, name):
    raw = request.query_params.get(name)
    return parse_date_or_error(name, raw) if raw else None


def day_start(day):
    return timezone.make_aware(datetime.combine(day, time.min))


def as_drf_error(exc):
    """Django ki ValidationError ko DRF ki 400 error mein badalta hai."""
    if hasattr(exc, 'error_dict'):
        return ValidationError(exc.message_dict)
    return ValidationError(exc.messages)


class LedgerPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

def date_window(request, max_days=92):
    """?date=today|YYYY-MM-DD ya ?date_from&date_to se (start, end) dates deta hai."""
    params = request.query_params
    today = timezone.localdate()
    if params.get('date'):
        raw = params['date']
        day = today if raw == 'today' else parse_date_or_error('date', raw)
        return day, day
    start = date_param(request, 'date_from')
    end = date_param(request, 'date_to')
    if start is None and end is None:
        return today, today
    end = end or today
    start = start or end
    if start > end:
        raise ValidationError({'date_from': 'date_from, date_to se pehle ki honi chahiye.'})
    if (end - start).days >= max_days:
        raise ValidationError({'date_to': f'Ek baar mein {max_days} din se zyada nahi.'})
    return start, end