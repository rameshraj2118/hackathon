type BrandProps = { light?: boolean; className?: string }
export function Brand({ light = false, className = '' }: BrandProps) { return <a className={`brand ${light ? 'light' : ''} ${className}`} href="#top" aria-label="Assetnesus home"><span className="mark" aria-hidden="true"><span></span><span></span><span></span></span><span>Asset<span>nesus</span></span></a> }
