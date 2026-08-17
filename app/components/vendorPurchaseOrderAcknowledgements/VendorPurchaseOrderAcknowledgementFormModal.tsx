import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  vendorPurchaseOrderAcknowledgementItemStatuses,
  vendorPurchaseOrderAcknowledgementStatuses,
  type VendorPurchaseOrderAcknowledgementInput,
  type VendorPurchaseOrderAcknowledgementItemInput,
  type VendorPurchaseOrderAcknowledgementItemStatus,
  type VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import type { VendorPurchaseOrderRecord } from '~/types/vendorPurchaseOrder';
import {
  vendorPurchaseOrderAcknowledgementItemStatusLabels,
  vendorPurchaseOrderAcknowledgementStatusLabels,
} from './VendorPurchaseOrderAcknowledgementStatusBadge';

export type VendorPurchaseOrderAcknowledgementFormValue =
  VendorPurchaseOrderAcknowledgementInput & {
    id?: string;
  };

type VendorPurchaseOrderAcknowledgementFormModalProps = {
  initialValue?: VendorPurchaseOrderAcknowledgementFormValue;
  vendorPurchaseOrders: VendorPurchaseOrderRecord[];
  onClose: () => void;
  onSubmit: (value: VendorPurchaseOrderAcknowledgementFormValue) => void;
};

const emptyItem = (): VendorPurchaseOrderAcknowledgementItemInput => ({
  vendorPurchaseOrderItemId: null,
  quantity: 1,
  price: 0,
  unit: 'unit',
  description: '',
  manufacturerPartNumber: null,
  deliveryDate: null,
  status: 'acknowledged',
  notes: null,
});

const itemFromVendorPoItem = (
  item: VendorPurchaseOrderRecord['items'][number],
): VendorPurchaseOrderAcknowledgementItemInput => ({
  vendorPurchaseOrderItemId: item.id,
  quantity: item.quantity,
  price: item.price,
  unit: item.unit,
  description: item.description,
  manufacturerPartNumber: item.manufacturerPartNumber,
  deliveryDate: null,
  status: 'acknowledged',
  notes: null,
});

export const VendorPurchaseOrderAcknowledgementFormModal = ({
  initialValue,
  vendorPurchaseOrders,
  onClose,
  onSubmit,
}: VendorPurchaseOrderAcknowledgementFormModalProps) => {
  const [vendorPurchaseOrderId, setVendorPurchaseOrderId] = useState(
    initialValue?.vendorPurchaseOrderId ?? vendorPurchaseOrders[0]?.id ?? '',
  );
  const [acknowledgementReference, setAcknowledgementReference] = useState(
    initialValue?.acknowledgementReference ?? '',
  );
  const [status, setStatus] =
    useState<VendorPurchaseOrderAcknowledgementStatus>(
      initialValue?.status ?? 'received',
    );
  const [acknowledgedAt, setAcknowledgedAt] = useState(
    initialValue?.acknowledgedAt ?? '',
  );
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [items, setItems] = useState<
    VendorPurchaseOrderAcknowledgementItemInput[]
  >(
    initialValue?.items ??
      vendorPurchaseOrders[0]?.items.map(itemFromVendorPoItem) ?? [emptyItem()],
  );

  const selectedVendorPurchaseOrder = useMemo(
    () =>
      vendorPurchaseOrders.find(
        (vendorPurchaseOrder) =>
          vendorPurchaseOrder.id === vendorPurchaseOrderId,
      ) ?? null,
    [vendorPurchaseOrderId, vendorPurchaseOrders],
  );

  const updateItem = (
    index: number,
    patch: Partial<VendorPurchaseOrderAcknowledgementItemInput>,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const selectVendorPoItem = (index: number, itemId: string) => {
    const sourceItem = selectedVendorPurchaseOrder?.items.find(
      (item) => item.id === itemId,
    );
    updateItem(
      index,
      sourceItem
        ? itemFromVendorPoItem(sourceItem)
        : { vendorPurchaseOrderItemId: null },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      id: initialValue?.id,
      vendorPurchaseOrderId,
      acknowledgementReference: acknowledgementReference || null,
      status,
      acknowledgedAt: acknowledgedAt || null,
      notes: notes || null,
      items,
    });
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/45 backdrop-blur-sm'
        aria-label='Close vendor PO acknowledgement form'
      />
      <div className='relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor PO acknowledgement
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              {initialValue ? 'Edit acknowledgement' : 'Create acknowledgement'}
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='mt-7 space-y-5'>
          <label className='block text-sm font-semibold text-slate-700'>
            Linked vendor PO
            <select
              required
              value={vendorPurchaseOrderId}
              onChange={(event) => {
                setVendorPurchaseOrderId(event.target.value);
                if (!initialValue) {
                  const nextVendorPo = vendorPurchaseOrders.find(
                    (vendorPurchaseOrder) =>
                      vendorPurchaseOrder.id === event.target.value,
                  );
                  setItems(
                    nextVendorPo?.items.map(itemFromVendorPoItem) ?? [
                      emptyItem(),
                    ],
                  );
                }
              }}
              className={inputClass}
            >
              {vendorPurchaseOrders.map((vendorPurchaseOrder) => (
                <option
                  key={vendorPurchaseOrder.id}
                  value={vendorPurchaseOrder.id}
                >
                  {vendorPurchaseOrder.reference} ·{' '}
                  {vendorPurchaseOrder.vendorName}
                </option>
              ))}
            </select>
          </label>

          <div className='grid gap-5 sm:grid-cols-3'>
            <label className='text-sm font-semibold text-slate-700'>
              Vendor ack reference
              <input
                value={acknowledgementReference}
                onChange={(event) =>
                  setAcknowledgementReference(event.target.value)
                }
                className={inputClass}
                placeholder='ACK-12345'
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as VendorPurchaseOrderAcknowledgementStatus,
                  )
                }
                className={inputClass}
              >
                {vendorPurchaseOrderAcknowledgementStatuses.map((value) => (
                  <option key={value} value={value}>
                    {vendorPurchaseOrderAcknowledgementStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Acknowledged date
              <input
                type='date'
                value={acknowledgedAt}
                onChange={(event) => setAcknowledgedAt(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <div className='mb-3 flex items-end justify-between gap-3'>
              <div>
                <h3 className='text-sm font-bold text-slate-800'>
                  Acknowledged items
                </h3>
                <p className='mt-1 text-xs text-slate-400'>
                  Confirm delivery date and status for each vendor line.
                </p>
              </div>
              <button
                type='button'
                onClick={() => setItems((current) => [...current, emptyItem()])}
                className='inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100'
              >
                <Plus size={14} /> Add item
              </button>
            </div>
            <div className='space-y-4'>
              {items.map((item, index) => (
                <div
                  key={index}
                  className='rounded-2xl border border-slate-200 bg-slate-50/50 p-4'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                      Item {index + 1}
                    </p>
                    <button
                      type='button'
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      disabled={items.length === 1}
                      className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40'
                      aria-label='Remove item'
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <label className='mt-3 block text-sm font-semibold text-slate-700'>
                    Vendor PO item
                    <select
                      value={item.vendorPurchaseOrderItemId ?? ''}
                      onChange={(event) =>
                        selectVendorPoItem(index, event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value=''>Manual item</option>
                      {selectedVendorPurchaseOrder?.items.map((sourceItem) => (
                        <option key={sourceItem.id} value={sourceItem.id}>
                          {sourceItem.quantity} {sourceItem.unit} ·{' '}
                          {sourceItem.description}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className='mt-4 grid gap-4 sm:grid-cols-[1fr_120px_120px]'>
                    <label className='text-sm font-semibold text-slate-700'>
                      Description
                      <input
                        required
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, {
                            description: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className='text-sm font-semibold text-slate-700'>
                      Quantity
                      <input
                        required
                        type='number'
                        min='0.0001'
                        step='0.0001'
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className='text-sm font-semibold text-slate-700'>
                      Unit
                      <input
                        required
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, { unit: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className='mt-4 grid gap-4 sm:grid-cols-4'>
                    <label className='text-sm font-semibold text-slate-700'>
                      Unit price
                      <input
                        type='number'
                        min='0'
                        step='0.01'
                        value={item.price ? item.price / 100 : ''}
                        onChange={(event) =>
                          updateItem(index, {
                            price: Math.round(
                              Number(event.target.value || 0) * 100,
                            ),
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className='text-sm font-semibold text-slate-700'>
                      Part number
                      <input
                        value={item.manufacturerPartNumber ?? ''}
                        onChange={(event) =>
                          updateItem(index, {
                            manufacturerPartNumber: event.target.value || null,
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className='text-sm font-semibold text-slate-700'>
                      Delivery date
                      <input
                        type='date'
                        value={item.deliveryDate ?? ''}
                        onChange={(event) =>
                          updateItem(index, {
                            deliveryDate: event.target.value || null,
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className='text-sm font-semibold text-slate-700'>
                      Item status
                      <select
                        value={item.status}
                        onChange={(event) =>
                          updateItem(index, {
                            status: event.target
                              .value as VendorPurchaseOrderAcknowledgementItemStatus,
                          })
                        }
                        className={inputClass}
                      >
                        {vendorPurchaseOrderAcknowledgementItemStatuses.map(
                          (value) => (
                            <option key={value} value={value}>
                              {
                                vendorPurchaseOrderAcknowledgementItemStatusLabels[
                                  value
                                ]
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>

                  <label className='mt-4 block text-sm font-semibold text-slate-700'>
                    Item notes
                    <textarea
                      value={item.notes ?? ''}
                      onChange={(event) =>
                        updateItem(index, { notes: event.target.value || null })
                      }
                      className={`${inputClass} min-h-20`}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <label className='block text-sm font-semibold text-slate-700'>
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${inputClass} min-h-24`}
            />
          </label>

          <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
            >
              Save acknowledgement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
