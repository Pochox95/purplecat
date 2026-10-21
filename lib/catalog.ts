export type CatalogProduct = {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  talla: string;
  color: string;
  precio_venta: number;
  descripcion: string;
  image_url: string;
  imagenes: string[] | null;
  disponible: boolean;
};
export function filterCatalog(
  products: CatalogProduct[],
  search: string,
  category: string,
  size: string,
  availableOnly: boolean,
) {
  const term = search.trim().toLocaleLowerCase("es");
  return products.filter(
    (p) =>
      (!term ||
        `${p.nombre} ${p.sku} ${p.descripcion || ""}`
          .toLocaleLowerCase("es")
          .includes(term)) &&
      (category === "Todas" || p.categoria === category) &&
      (size === "Todas" || p.talla === size) &&
      (!availableOnly || p.disponible),
  );
}
