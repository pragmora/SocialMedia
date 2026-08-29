import { BadRequestException } from '@nestjs/common';
import { FinancesService, resolveMovementStatus } from './finances.service';

type DbResult = { data?: unknown; error?: unknown };

/**
 * Mock encadenado del query builder de supabase-js.
 * Cada entrada de `results` es la respuesta de una consulta terminal (single()).
 */
function buildQueryMock(results: DbResult[]) {
  const queue = [...results];
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    'from',
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'gte',
    'lte',
    'is',
  ]) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() =>
    Promise.resolve(queue.length ? queue.shift() : { data: null, error: null }),
  );
  return builder;
}

function serviceWith(results: DbResult[]) {
  const builder = buildQueryMock(results);
  const svc = new FinancesService({ db: { from: jest.fn(() => builder) } } as any);
  return { svc, builder };
}

const baseDto = { amount: 10000, payment_date: '2026-08-24' };

describe('resolveMovementStatus', () => {
  it('egreso siempre resuelve a cobrado', () => {
    expect(resolveMovementStatus(true, 'paid')).toBe('paid');
    expect(resolveMovementStatus(true, 'pending')).toBe('paid');
  });

  it('egreso sin estado resuelve a cobrado', () => {
    expect(resolveMovementStatus(true)).toBe('paid');
  });

  it('pago conserva el estado recibido', () => {
    expect(resolveMovementStatus(false, 'pending')).toBe('pending');
    expect(resolveMovementStatus(false, 'paid')).toBe('paid');
  });

  it('pago sin estado cae al default pendiente', () => {
    expect(resolveMovementStatus(false)).toBe('pending');
  });
});

describe('FinancesService.create — regla egreso => cobrado', () => {
  it('crea egreso con estado cobrado', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p1' }, error: null }]);
    await svc.create('ws1', 'u1', { ...baseDto, is_spent: true, status: 'paid' });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    );
  });

  it('no persiste pendiente aunque el cliente envíe ese estado para un egreso', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p2' }, error: null }]);
    await svc.create('ws1', 'u1', { ...baseDto, is_spent: true, status: 'pending' });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    );
  });

  it('crea egreso sin estado y termina cobrado', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p3' }, error: null }]);
    await svc.create('ws1', 'u1', { ...baseDto, is_spent: true });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    );
  });

  it('un pago mantiene su estado pendiente', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p4' }, error: null }]);
    await svc.create('ws1', 'u1', { ...baseDto, is_spent: false, status: 'pending' });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: false, status: 'pending' }),
    );
  });

  it('crea pago con estado cobrado sin alterarlo', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p4b' }, error: null }]);
    await svc.create('ws1', 'u1', { ...baseDto, is_spent: false, status: 'paid' });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: false, status: 'paid' }),
    );
  });
});

describe('FinancesService.update — regla egreso => cobrado', () => {
  it('editar un pago convirtiéndolo en egreso lo deja cobrado', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p5' }, error: null }]);
    await svc.update('ws1', 'u1', 'p5', {
      ...baseDto,
      is_spent: true,
      status: 'pending',
    });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    );
  });

  it('editar un egreso nunca lo persiste con otro estado', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p6' }, error: null }]);
    await svc.update('ws1', 'u1', 'p6', { ...baseDto, is_spent: true });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: true, status: 'paid' }),
    );
  });

  it('editar un pago conserva su estado', async () => {
    const { svc, builder } = serviceWith([{ data: { id: 'p7' }, error: null }]);
    await svc.update('ws1', 'u1', 'p7', { ...baseDto, is_spent: false, status: 'paid' });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_spent: false, status: 'paid' }),
    );
  });
});

describe('FinancesService.toggleStatus — invariante del egreso', () => {
  it('rechaza alternar el estado de un egreso sin persistir cambios', async () => {
    const { svc, builder } = serviceWith([
      { data: { status: 'paid', is_spent: true }, error: null },
    ]);

    await expect(svc.toggleStatus('ws1', 'p8')).rejects.toBeInstanceOf(BadRequestException);
    expect(builder.update).not.toHaveBeenCalled();
  });

  it('altera el estado de un pago normalmente', async () => {
    const { svc } = serviceWith([
      { data: { status: 'pending', is_spent: false }, error: null },
      { data: { id: 'p9', status: 'paid' }, error: null },
    ]);

    const result = await svc.toggleStatus('ws1', 'p9');
    expect(result.status).toBe('paid');
  });
});
