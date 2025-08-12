import { Category } from "./category_interface";
import Link from "next/link";

export default function CategoryList({ categories }: { categories: Category[] }) {
  // Filter categories to show only those with status "show"
  const filteredCategories = categories.filter((category) => category.status === "show");

  return (
    <div className="category-list">
      {filteredCategories.map((category) => (
        <div key={category._id} className="category-itemm">
          <Link href={`/user/product?category=${encodeURIComponent(category.name)}`}>
            <h2>{category.name}</h2>
          </Link>
        </div>
      ))}
    </div>
  );
}