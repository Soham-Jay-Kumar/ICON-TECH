import { redirect } from 'next/navigation';

/**
 * Products now lives as a section on the home page. Keep old direct links and
 * bookmarks working by forwarding them to that preserved section instead of
 * rendering a 404.
 */
export default function ProductsPage() {
  redirect('/#products');
}
