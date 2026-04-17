import ProductCard from '@/components/ProductCard';
import SkeletonCard from '@/components/SkeletonCard';
import { PackageOpen } from 'lucide-react';

export default function ProductGrid({ products, isLoading, onProductClick, category, compareItems, onToggleCompare, user }) {
  if (isLoading) return <div data-testid="skeleton-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{Array.from({length:12}).map((_,i) => <SkeletonCard key={i} />)}</div>;
  if (products.length === 0) return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-4"><PackageOpen className="w-8 h-8 text-zinc-600" /></div>
      <h3 className="text-lg font-heading font-semibold text-white">No accounts found</h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-xs">Try adjusting your filters or search query.</p>
    </div>
  );
  return (
    <div data-testid="product-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {products.map((p, i) => <ProductCard key={p.item_id} product={p} onClick={onProductClick} index={i} category={category} compareItems={compareItems} onToggleCompare={onToggleCompare} user={user} />)}
    </div>
  );
}
