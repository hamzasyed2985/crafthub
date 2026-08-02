import { Price } from './Price';

export type ProductCardProps = {
  href: string;
  title: string;
  imageUrl?: string | null;
  imageAlt?: string;
  priceCents: number;
  currency?: string;
  vendorName?: string;
  vendorHref?: string;
};

export function ProductCard({
  href,
  title,
  imageUrl,
  imageAlt,
  priceCents,
  currency = 'USD',
  vendorName,
  vendorHref,
}: ProductCardProps) {
  return (
    <article className="group flex flex-col gap-2">
      <a
        href={href}
        className="block overflow-hidden rounded-lg border border-border bg-background-subtle"
      >
        <div className="aspect-[4/5] w-full overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt || title}
              className="h-full w-full object-cover transition duration-300 motion-reduce:transition-none group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-subtle">
              No image
            </div>
          )}
        </div>
      </a>
      <div className="flex flex-col gap-0.5">
        {vendorName ? (
          vendorHref ? (
            <a href={vendorHref} className="text-sm text-muted hover:text-foreground">
              {vendorName}
            </a>
          ) : (
            <span className="text-sm text-muted">{vendorName}</span>
          )
        ) : null}
        <a href={href} className="font-semibold text-foreground hover:text-accent">
          {title}
        </a>
        <Price cents={priceCents} currency={currency} />
      </div>
    </article>
  );
}
