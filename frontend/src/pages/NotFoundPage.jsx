import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import SiteLayout from "../components/SiteLayout.jsx";

export default function NotFoundPage() {
  return <SiteLayout><main className="page-shell not-found"><p className="eyebrow">A page not found</p><h1>This address has <em>no listing.</em></h1><p>It may have moved, or perhaps it has not been imagined yet.</p><Link className="button button-dark" to="/"><ArrowLeft size={15} /> Return to the collection</Link></main></SiteLayout>;
}
