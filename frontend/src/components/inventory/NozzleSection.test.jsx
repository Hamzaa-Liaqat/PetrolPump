import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTanks } from '@/api/inventory';
import { createNozzle, fetchNozzles, updateNozzle } from '@/api/sales';
import NozzleSection from '@/components/inventory/NozzleSection';
import { AuthContext } from '@/context/AuthContext';
import { nozzleFixture, tankFixture } from '@/test/fixtures';

vi.mock('@/api/inventory', () => ({ fetchTanks: vi.fn() }));
vi.mock('@/api/sales', () => ({ fetchNozzles: vi.fn(), createNozzle: vi.fn(), updateNozzle: vi.fn() }));

const tanks = [tankFixture(), tankFixture({ id: 2, name: 'Tank-2', fuel_type: 'diesel' })];
const rowOf = (name) => screen.getByText(name).closest('tr');

function renderSection(role = 'owner') {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}>
      <NozzleSection />
    </AuthContext.Provider>,
  );
}

describe('NozzleSection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchTanks.mockResolvedValue({ data: tanks });
    fetchNozzles.mockResolvedValue({
      data: [
        nozzleFixture(),
        nozzleFixture({ id: 2, name: 'N2', fuel_type: 'diesel', tank: 2, tank_name: 'Tank-2', is_active: false, current_rate: null }),
      ],
    });
  });

  it('sab nozzles, meter, rate aur haalat dikhata hai', async () => {
    renderSection();
    expect(await screen.findByText('N2')).toBeInTheDocument();
    expect(within(rowOf('N1')).getByText('Rs 250.00')).toBeInTheDocument();
    expect(within(rowOf('N1')).getByText('Chalu')).toBeInTheDocument();
    expect(within(rowOf('N2')).getByText('Band')).toBeInTheDocument();
    expect(within(rowOf('N2')).getByText('Rate set nahi')).toBeInTheDocument();
  });

  it('manager aur cashier (sirf dekhna): na Naya nozzle, na Edit', async () => {
    renderSection('manager');
    await screen.findByText('N1');
    expect(screen.queryByRole('button', { name: 'Naya nozzle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('koi chalu tank na ho to Naya nozzle band aur wajah likhi hui', async () => {
    fetchTanks.mockResolvedValue({ data: [tankFixture({ is_active: false })] });
    renderSection();
    await screen.findByText('N1');
    expect(screen.getByRole('button', { name: 'Naya nozzle' })).toBeDisabled();
    expect(screen.getByText(/pehle ek chalu tank banayein/)).toBeInTheDocument();
  });

  it('khali form par ghalti, API nahi', async () => {
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya nozzle' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(within(dialog).getByText('Nozzle ka naam likhein.')).toBeInTheDocument();
    expect(within(dialog).getByText('Tank chunein.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Meter ki reading number ho/)).toBeInTheDocument();
    expect(createNozzle).not.toHaveBeenCalled();
  });

  it('tank chunte hi fuel khud, phir sahi payload', async () => {
    createNozzle.mockResolvedValue({ data: {} });
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya nozzle' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nozzle ka naam'), 'N3');
    await userEvent.selectOptions(within(dialog).getByLabelText('Tank'), '2');
    expect(within(dialog).getByLabelText('Fuel')).toHaveValue('Diesel');
    await userEvent.type(within(dialog).getByLabelText('Meter ki abhi ki reading'), '1500.5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(createNozzle).toHaveBeenCalledWith({ name: 'N3', fuel_type: 'diesel', tank: 2, initial_reading: '1500.5' });
    expect(fetchNozzles.mock.calls.length).toBeGreaterThan(1);
  });

  it('server ki "naam pehle se hai" wali ghalti naam ke neeche', async () => {
    createNozzle.mockRejectedValue({ response: { status: 400, data: { name: ['nozzle with this name already exists.'] } } });
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya nozzle' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nozzle ka naam'), 'N1');
    await userEvent.selectOptions(within(dialog).getByLabelText('Tank'), '1');
    await userEvent.type(within(dialog).getByLabelText('Meter ki abhi ki reading'), '10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(await within(dialog).findByText('nozzle with this name already exists.')).toBeInTheDocument();
  });

  it('edit: tank/fuel sirf dikhte hain, sirf naam aur chalu/band jata hai', async () => {
    updateNozzle.mockResolvedValue({ data: {} });
    renderSection();
    await screen.findByText('N1');
    await userEvent.click(within(rowOf('N1')).getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Tank')).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText('Fuel')).toHaveAttribute('readonly');
    await userEvent.click(within(dialog).getByLabelText('Nozzle chalu hai'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(updateNozzle).toHaveBeenCalledWith(1, { name: 'N1', is_active: false });
  });

  it('server band ho to saaf paigham', async () => {
    fetchNozzles.mockRejectedValue(new Error('Network Error'));
    renderSection();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
  });
});