import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';

export default function NewProduct() {
  return (
    <>
      <Link href="/admin/products" className="muted" style={{ fontSize: 14 }}>← Products</Link>
      <div className="page-head"><h1>Add product</h1></div>
      <ProductForm />
    </>
  );
}
