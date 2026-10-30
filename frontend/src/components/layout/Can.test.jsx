import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Can from '@/components/layout/Can';
import { AuthContext } from '@/context/AuthContext';
import { useCan } from '@/hooks/UseCan';

const withRole = (role, ui) => render(<AuthContext.Provider value={{ role }}>{ui}</AuthContext.Provider>);

function Probe() {
  const allowed = useCan();
  return <p>{allowed('sale.void') ? 'void-ok' : 'void-no'}</p>;
}

describe('Can / useCan', () => {
  it('ijazat ho to bachay dikhte hain', () => {
    withRole('owner', <Can action="tank.create"><button>Naya tank</button></Can>);
    expect(screen.getByRole('button', { name: 'Naya tank' })).toBeInTheDocument();
  });

  it('ijazat na ho to kuch nahi, ya fallback', () => {
    const { unmount } = withRole('manager', <Can action="tank.create"><button>Naya tank</button></Can>);
    expect(screen.queryByRole('button', { name: 'Naya tank' })).not.toBeInTheDocument();
    unmount();
    withRole('cashier', <Can action="tank.create" fallback={<p>Sirf owner</p>}><button>Naya tank</button></Can>);
    expect(screen.getByText('Sirf owner')).toBeInTheDocument();
  });

  it('anjaan action par kuch nahi', () => {
    withRole('owner', <Can action="koi.nahi"><p>chhupa</p></Can>);
    expect(screen.queryByText('chhupa')).not.toBeInTheDocument();
  });

  it('useCan hook role ke hisaab se jawab deta hai', () => {
    const { unmount } = withRole('manager', <Probe />);
    expect(screen.getByText('void-ok')).toBeInTheDocument();
    unmount();
    withRole('cashier', <Probe />);
    expect(screen.getByText('void-no')).toBeInTheDocument();
  });
});