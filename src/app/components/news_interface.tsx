export interface News {
  _id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  thumbnailCaption: string;
  status: 'hidden' | 'show';
  views: number;
  createdAt: string;
  publishedAt: string;
  content: string;
  [key: string]: any; // for any other dynamic fields
}