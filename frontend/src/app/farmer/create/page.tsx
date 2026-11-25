"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { ListingForm } from "@/components/marketplace/ListingForm";

function Create() {
  const editId = useSearchParams().get("edit");
  const [edit, setEdit] = useState<Listing | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!editId) return;
    api<{ listing: Listing }>("/listings/" + editId).then((r) => (r.listing.canEdit ? setEdit(r.listing) : setErr("This listing is locked: it already has a bid or offer."))).catch((e) => setErr(e.message));
  }, [editId]);
  return (
    <>
      <div className="head"><div><h1>{editId ? "Edit listing" : "Create listing"}</h1><p>{editId ? "Change anything until the first bid or offer arrives." : "List your produce for dealers. You can list before harvesting."}</p></div><span className="code">Screen F2</span></div>
      {err ? <div className="note bad">{err}</div> : editId && !edit ? <p className="muted">Loading…</p> : <ListingForm key={edit?.id ?? "new"} edit={edit ?? undefined} />}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Create /></Suspense>;
}
