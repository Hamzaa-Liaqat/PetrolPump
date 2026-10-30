import { useState } from 'react';
import { fetchCreditSummary, fetchCustomers, reverseTransaction } from '@/api/credit';
import { fetchCurrentRates } from '@/api/rates';
import MetricCard from '@/components/dashboard/MetricCard';
import CreditSaleDialog from '@/components/credit/CreditSaleDialog';
import CustomerFormDialog from '@/components/credit/CustomerFormDialog';
import PaymentDialog from '@/components/credit/PaymentDialog';
import StatementDialog from '@/components/credit/StatementDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import ReasonDialog from '@/components/ui/ReasonDialog';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { filterCustomers } from '@/utils/credit';
import { getErrorMessage } from '@/utils/error';
import { formatDateTime, formatMoney } from '@/utils/formate';

export default function CreditLedger() {
  const { role } = useAuth();
  const canEditLimit = can(role, 'credit.limit.edit');
  const canReverse = can(role, 'credit.reverse');
  const customers = useFetch(fetchCustomers, []);
  const summary = useFetch(fetchCreditSummary, []);
  const rates = useFetch(fetchCurrentRates, []);
  const [search, setSearch] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [dialog, setDialog] = useState(null);

  const all = customers.data ?? [];
  const rows = filterCustomers(all, search, { onlyDue });

  function refreshAll() {
    customers.reload();
    summary.reload();
  }

  function finish() {
    setDialog(null);
    refreshAll();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Credit</h1>
          <p className="text-sm text-ink-soft">Udhaar, payment aur har customer ka hisaab.</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ type: 'customer', customer: null })}>
          Naya customer
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Udhaar ka khulasa">
        <MetricCard label="Kul udhaar baqi" value={formatMoney(summary.data?.total_due ?? 0)} tone="coral" />
        <MetricCard label="Udhaar wale customers" value={String(summary.data?.customers_with_due ?? 0)} tone="marigold" />
        <MetricCard label="Alerts" value={String(summary.data?.alerts_count ?? 0)} hint="Limit se zyada ya 30 din se payment nahi" tone="periwinkle" />
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <TextField
            className="w-full max-w-xs"
            label="Customer dhoondhein"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Naam ya phone"
          />
          <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={onlyDue}
              onChange={(event) => setOnlyDue(event.target.checked)}
              className="h-4 w-4 accent-marigold-500"
            />
            Sirf udhaar wale
          </label>
        </div>

        {customers.loading ? (
          <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
            <Spinner className="h-5 w-5 text-marigold-600" />
            <span className="text-sm font-semibold">Customers aa rahe hain...</span>
          </div>
        ) : !customers.data ? (
          <div className="space-y-3">
            <Alert tone="error">{getErrorMessage(customers.error)}</Alert>
            <Button onClick={customers.reload}>Dobara koshish karein</Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            {all.length === 0 ? 'Abhi koi customer nahi.' : 'Koi customer nahi mila.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-184 text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3 text-right">Baqi</th>
                  <th className="py-2 pr-3 text-right">Limit</th>
                  <th className="py-2 pr-3">Aakhri payment</th>
                  <th className="py-2 text-right">Kaam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {rows.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-ink">{customer.name}</span>
                      {customer.is_over_limit && (
                        <span className="ml-2 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-bold text-coral-800">Limit se zyada</span>
                      )}
                      {!customer.is_active && (
                        <span className="ml-2 rounded-full bg-sand-200 px-2 py-0.5 text-xs font-bold text-ink-soft">Band</span>
                      )}
                      <span className="block text-xs text-ink-soft">{customer.phone}</span>
                    </td>
                    <td className={`py-2.5 pr-3 text-right font-bold ${Number(customer.balance) > 0 ? 'text-coral-800' : 'text-ink'}`}>
                      {formatMoney(customer.balance, 2)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">{formatMoney(customer.credit_limit)}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{customer.last_payment_at ? formatDateTime(customer.last_payment_at) : '-'}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="soft"
                          size="sm"
                          disabled={!customer.is_active}
                          onClick={() => setDialog({ type: 'sale', customer })}
                        >
                          Udhaar
                        </Button>
                        <Button
                          variant="soft"
                          size="sm"
                          disabled={!(Number(customer.balance) > 0)}
                          onClick={() => setDialog({ type: 'payment', customer })}
                        >
                          Payment
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'statement', customer })}>
                          Statement
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'customer', customer })}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'customer' && (
        <CustomerFormDialog customer={dialog.customer} isOwner={canEditLimit} onClose={() => setDialog(null)} onSaved={finish} />
      )}
      {dialog?.type === 'sale' && (
        <CreditSaleDialog customer={dialog.customer} rates={rates.data ?? []} onClose={() => setDialog(null)} onSaved={finish} />
      )}
      {dialog?.type === 'payment' && (
        <PaymentDialog customer={dialog.customer} onClose={() => setDialog(null)} onSaved={finish} />
      )}
      {dialog?.type === 'statement' && (
        <StatementDialog
          customer={dialog.customer}
          canReverse={canReverse}
          onReverse={(entry) => setDialog({ type: 'reverse', customer: dialog.customer, entry })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'reverse' && (
        <ReasonDialog
          title={`Reverse: ${dialog.entry.type_label}`}
          description="Entry mitati nahi, ulti entry banti hai. Cheque bounce ya ghalat entry ke liye."
          confirmLabel="Reverse karein"
          onConfirm={(reason) => reverseTransaction(dialog.entry.id, reason)}
          onClose={() => setDialog(null)}
          onDone={finish}
        />
      )}
    </div>
  );
}