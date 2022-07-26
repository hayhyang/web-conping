import productJson from '../../../../../static/data/product.json';
import relationJson from '../../../../../static/data/relation.json';
import type { Product, VideoContent } from '$lib/models/backend/backend';
import type { IProduct } from '../../../../global/types';
import { GET } from '$lib/_api';
import { convertProduct } from './util';
import { getThumbnail } from './util';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const products = async ({ order, category, limit, page }: {order: 'latest' | 'popularity' | 'highPrice' | 'lowPrice' | 'alphabetical', category: number, limit:number, page: number}) => {
  let sort: any[] = [{ 'views': 'asc' }];

  switch (order) {
  case 'latest':
    sort = [{ 'createdAt': 'asc' }];
    break;
  case 'popularity':
    sort = [{ 'views': 'asc' }];
    break;
  case 'highPrice':
    sort = [{ 'price': 'desc' }];
    break;
  case 'lowPrice':
    sort = [{ 'price': 'asc' }];
    break;
  case 'alphabetical':
    sort = [{ 'name': 'asc' }];
    break;
  }

  const params:any = {
    sort: JSON.stringify(sort),
    videoContent: true,
    celeb: true,
    size: limit || 10,
    page: page || 1,
  };

  if (category) {
    params['category'] = category;
  }


  const response: any = await GET('/product', { method: 'GET', params: params });
  const products = response.elements.map((product: any) => {
    const relatedItems = [];
    /* Generate Contents */
    const contents = product.VideoContentProduct.map((p: any) => {
      const thumb = getThumbnail(p.VideoContent.Video[0].youtubeVideoId);
      return {
        id: p.VideoContent.id,
        title: p.VideoContent.title,
        subtitle: p.VideoContent.subtitle,
        description: p.VideoContent.description,
        thumb,
      };
    });

    const celebs = product.CelebProduct.map((c: any) => {
      return {
        id: c.Celeb.id,
        name: c.Celeb.name,
        thumbnail: c.Celeb.image,
      };
    });

    if (celebs.length) {
      relatedItems.push({
        thumbnail: celebs[0].thumbnail,
        title: celebs[0].name,
        type: 'Celeb',
        id: celebs[0].id,
      });
    }

    if (contents.length) {
      relatedItems.push({
        thumbnail: contents[0].thumb,
        title: contents[0].title,
        type: 'Content',
        id: contents[0].id,
      });
    }

    const node = {
      id: product.id,
      name: product.name,
      brand: 'No Brand',
      price: product.price,
      discountRate: product.discountRate,
      image: product.image,
      storeUrl: product.storeUrl,
      views: product.views,
      createDt: +new Date(product.createdAt),
      contents,
      celebs,
      relatedItems,
    };

    const cursor = product.id;

    return {
      node,
      cursor,
    };
  });

  return {
    totalCount: response.totalElements,
    edges: products,
    pageInfo: {
      page: response.page,
      totalPage: response.totalPages,
      hasNextPage: response.page < response.totalPages,
    },
  };
};

export const product = async ({ id }: {id: string}) => {
  return productJson.find((product) => product.id === id);
};

export const getProductsByContentId = async ({ id }: { id: string }) => {
  const content:VideoContent = await GET(`/video-content/${id}?product=true`);
  const products: IProduct[] = [];
  if (content.VideoContentProduct) {
    content.VideoContentProduct.forEach(videoContentProduct => {
      const product: IProduct | undefined = convertProduct(videoContentProduct.Product, +id);
      if (product) {
        products.push(product);
      }
    });
  }
  return products;
};

export const getProductByCelebId = ({ id, limit }: { id: string, limit: number }) => {
  const productIds = relationJson
    .filter((relation: any) => relation.celeb === id)
    .map((relation: any) => relation.product);

  let products = productJson.filter((product) => productIds.includes(product.id));

  if (limit) {
    products = products.splice(0, limit);
  }
  return products;
};
