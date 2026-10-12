export type PriceMode = 'quote' | 'fixed' | 'from';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Category {
	id: string;
	slug: string;
	name: string;
	description: string;
	product_count?: number;
}

export interface ProductImage {
	id: string;
	key: string;
	alt_text: string;
	width: number | null;
	height: number | null;
	position: number;
	is_primary: number;
}

export interface Product {
	id: string;
	slug: string;
	name: string;
	category_id: string;
	category_name: string;
	category_slug: string;
	short_description: string;
	description: string;
	price_mode: PriceMode;
	price_amount: number | null;
	price_currency: string;
	is_featured: number;
	status: ProductStatus;
	is_demo: number;
	specifications: Record<string, string>;
	seo_title: string;
	seo_description: string;
	created_at: string;
	updated_at: string;
	images: ProductImage[];
}

export interface Enquiry {
	id: string;
	name: string;
	email: string;
	phone: string;
	message: string;
	product_name: string | null;
	status: 'new' | 'contacted' | 'closed';
	created_at: string;
}

