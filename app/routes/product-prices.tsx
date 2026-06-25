import { useMemo, useState } from 'react';
import { data, redirect, useFetcher } from 'react-router';
import {
  CalendarDays,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Route } from './+types/product-prices';
import { ConfirmModal } from '~/components/ConfirmModal';
import { ProductPriceFormModal } from '~/components/productPrices/ProductPriceFormModal';
import {
  createProductPrice,
  deleteProductPrice,
  listProductPrices,
  updateProductPrice,
} from '~/db/productPrices';
import { getOrCreateManufacturer, listManufacturers } from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import type { ProductPriceRecord } from '~/types/productPrice';
import { formatRfqMoney } from '~/utils/rfq';
import { parseProductPriceFormData } from '~/utils/productPrices.server';
import { getUserFromRequest } from '~/utils/session.server';

type ActionResponse = { success: true } | { error: string };

const formatDate = (date: string | null) => {
  if (!date) {
    return 'Not set';
  }
  return new Date(`${date}T00:00:00`).toLocaleDateString();
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  return data({
    productPrices: await listProductPrices(organization.id),
    manufacturers: await listManufacturers(organization.id),
  });
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');
  const id = String(formData.get('id') ?? '');

  if (intent === 'delete') {
    const deleted = await deleteProductPrice(id, organization.id);
    if (!deleted) {
      return data({ error: 'Product price not found' }, { status: 404 });
    }
    return data({ success: true as const });
  }

  const parsed = parseProductPriceFormData(formData);
  if (!parsed.success) {
    return data({ error: parsed.error }, { status: 400 });
  }
  const manufacturer = await getOrCreateManufacturer(
    organization.id,
    user.id,
    parsed.value.manufacturer,
  );
  const productPriceInput = {
    ...parsed.value,
    manufacturer: manufacturer?.name ?? parsed.value.manufacturer,
    manufacturerId: manufacturer?.id ?? null,
  };

  if (intent === 'create') {
    await createProductPrice(organization.id, user.id, productPriceInput);
    return data({ success: true as const }, { status: 201 });
  }

  if (intent === 'update') {
    const updated = await updateProductPrice(
      id,
      organization.id,
      productPriceInput,
    );
    if (!updated) {
      return data({ error: 'Product price not found' }, { status: 404 });
    }
    return data({ success: true as const });
  }

  return data({ error: 'Invalid action' }, { status: 400 });
};

const ProductPricesPage = ({ loaderData }: Route.ComponentProps) => {
  const productPrices = loaderData.productPrices;
  const deleteFetcher = useFetcher<ActionResponse>();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] =
    useState<ProductPriceRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductPriceRecord | null>(
    null,
  );

  const filteredProductPrices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return productPrices;
    }
    return productPrices.filter((productPrice) =>
      [
        productPrice.name,
        productPrice.manufacturer,
        productPrice.partNumber,
        productPrice.description,
        productPrice.specifications,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [productPrices, search]);

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    deleteFetcher.submit(
      { intent: 'delete', id: deleteTarget.id },
      { method: 'post' },
    );
    setDeleteTarget(null);
  };

  return (
    <div className='mx-auto max-w-[1320px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Product catalog
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Product prices
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Manage reusable product pricing for parts requested in RFQs.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setIsCreating(true)}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
        >
          <Plus size={18} /> New product
        </button>
      </div>

      {deleteFetcher.data && 'error' in deleteFetcher.data && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {deleteFetcher.data.error}
        </p>
      )}

      <section className='mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
          <label className='relative block w-full sm:max-w-md'>
            <Search
              className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search products, manufacturers, or part numbers'
            />
          </label>
          <p className='text-sm font-medium text-slate-500'>
            {filteredProductPrices.length} product
            {filteredProductPrices.length === 1 ? '' : 's'}
          </p>
        </div>

        {filteredProductPrices.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Package size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No product prices found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              {productPrices.length === 0
                ? 'Create the first product price to start building a catalog.'
                : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[980px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                <tr>
                  <th className='px-5 py-3'>Product</th>
                  <th className='px-5 py-3'>Manufacturer</th>
                  <th className='px-5 py-3'>Part number</th>
                  <th className='px-5 py-3'>Price</th>
                  <th className='px-5 py-3'>Last updated</th>
                  <th className='px-5 py-3'>Specifications</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredProductPrices.map((productPrice) => (
                  <tr
                    key={productPrice.id}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='max-w-[300px] px-5 py-4'>
                      <p className='font-semibold text-slate-900'>
                        {productPrice.name}
                      </p>
                      <p className='mt-1 line-clamp-2 text-xs leading-5 text-slate-500'>
                        {productPrice.description ?? 'No description'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      {productPrice.manufacturer ?? '—'}
                    </td>
                    <td className='px-5 py-4 font-medium text-slate-700'>
                      {productPrice.partNumber ?? '—'}
                    </td>
                    <td className='px-5 py-4 font-semibold text-slate-950'>
                      {formatRfqMoney(
                        productPrice.price,
                        productPrice.currency,
                      )}
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      <span className='flex items-center gap-1.5'>
                        <CalendarDays size={14} />
                        {formatDate(productPrice.priceLastUpdated)}
                      </span>
                    </td>
                    <td className='max-w-[260px] px-5 py-4'>
                      <p className='line-clamp-2 text-slate-600'>
                        {productPrice.specifications ?? '—'}
                      </p>
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <button
                          type='button'
                          onClick={() => setEditingProduct(productPrice)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${productPrice.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(productPrice)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${productPrice.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isCreating && (
        <ProductPriceFormModal
          productPrice={null}
          manufacturers={loaderData.manufacturers}
          onClose={() => setIsCreating(false)}
        />
      )}
      {editingProduct && (
        <ProductPriceFormModal
          key={editingProduct.id}
          productPrice={editingProduct}
          manufacturers={loaderData.manufacturers}
          onClose={() => setEditingProduct(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this product price?'
        description={`${deleteTarget?.name ?? 'This product price'} will be permanently removed from your catalog.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={deleteFetcher.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default ProductPricesPage;
