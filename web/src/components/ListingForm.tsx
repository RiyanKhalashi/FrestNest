"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { tk, tk0, kg, dateTime, toLocalInput, STORAGE_LABEL, SCOPE_LABEL } from "@/lib/format";
import type { Listing, Product, Scope, Storage } from "@/lib/types";

const STORAGES: Storage[] = ["NORMAL", "VENTILATED", "REFRIGERATED"];
const RANK: Record<Storage, number> = { NORMAL: 0, VENTILATED: 1, REFRIGERATED: 2 };
import { FieldErr, useToast } from "./ui";
import { shrink } from "@/lib/image";

interface Preview { info: { name: string; shelf: number; storage: Storage; suggested: Storage; longTrip: Storage }; season: { name: string; months: string; risk: boolean }; suggestion: { scope: Scope; why: string }; window: { min: string; latestSafe: string; recommended: string; expiresAt: string; tooShort: boolean } }
interface Nearby { upazila: { id: number; name: string } | null; district: { id: number; name: string } | null; neighbourUpazilas: { id: number; name: string }[]; neighbourDistricts: { id: number; name: string }[]; otherDistricts: { id: number; name: string }[] }

const tomorrow = () => { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10); };

export function ListingForm({ edit }: { edit?: Listing }) {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [nearby, setNearby] = useState<Nearby | null>(null);
  const [category, setCategory] = useState(edit?.product.category ?? "Vegetable");
  const [productId, setProductId] = useState<number | "custom" | 0>(edit ? (edit.product.custom ? "custom" : edit.product.id ?? 0) : 0);
  const [custom, setCustom] = useState({ name: edit?.product.custom ? edit.product.name : "", shelf: edit?.product.custom ? String(edit.product.shelfLifeDays) : "", storage: (edit?.product.custom ? edit.product.longTrip : "NORMAL") as Storage });
  const [qty, setQty] = useState(edit ? String(edit.quantityKg) : "");
  const [price, setPrice] = useState(edit ? String(edit.pricePerKg) : "");
  const [harvest, setHarvest] = useState(edit ? edit.harvestDate.slice(0, 10) : tomorrow());
  const [description, setDescription] = useState(edit?.description ?? "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [scope, setScope] = useState<Scope | null>(edit?.scope ?? null);
  const [scopeTouched, setScopeTouched] = useState(!!edit);
  const [tUp, setTUp] = useState<number[]>(edit?.targets.upazilas.map((x) => x.id) ?? []);
  const [tDist, setTDist] = useState<number[]>(edit?.targets.districts.map((x) => x.id) ?? []);
  const [vehicle, setVehicle] = useState<Storage | "">(edit?.product.vehicleNeed ?? "");
  const [mode, setMode] = useState<"BID" | "OWN">(edit?.mode ?? "BID");
  const [bidEnd, setBidEnd] = useState(edit?.bidding ? toLocalInput(new Date(edit.bidding.endsAt)) : "");
  const [bidEndTouched, setBidEndTouched] = useState(!!edit);
  const [inc, setInc] = useState(edit?.bidding ? String(edit.bidding.minIncrement) : "0.5");
  const [buyNow, setBuyNow] = useState(edit?.bidding?.buyNowPrice ? String(edit.bidding.buyNowPrice) : "");
  const [minOrder, setMinOrder] = useState(edit?.own?.minOrderKg ? String(edit.own.minOrderKg) : "");
  const [minReply, setMinReply] = useState(String(edit?.own?.minResponseHours ?? 6));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ products: Product[] }>("/meta/products").then((r) => setProducts(r.products));
    api<Nearby>("/listings/nearby").then(setNearby);
  }, []);

  const productBody = useMemo(() => (productId === "custom"
    ? (custom.name.trim().length >= 2 && +custom.shelf > 0 ? { customName: custom.name.trim(), customShelfLife: +custom.shelf, customStorage: custom.storage } : null)
    : productId ? { productId } : null), [productId, custom]);

  // live suggestion + deadline window
  useEffect(() => {
    if (!productBody || !harvest) { setPreview(null); return; }
    const t = setTimeout(() => {
      api<Preview>("/listings/preview", { body: { ...productBody, category, harvestDate: harvest + "T06:00:00", scope: scope ?? undefined } })
        .then((p) => {
          setPreview(p);
          if (!scopeTouched) setScope(p.suggestion.scope);
          if (!bidEndTouched) setBidEnd(toLocalInput(new Date(p.window.recommended)));
        }).catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(t);
  }, [productBody, harvest, scope, category, scopeTouched, bidEndTouched]);

  const list = products.filter((p) => p.category === category);
  const w = preview?.window;
  const end = bidEnd ? new Date(bidEnd) : null;
  const endState = !w || !end ? null : end.getTime() < new Date(w.min).getTime() - 15 * 60_000 ? "short" : end > new Date(w.latestSafe) ? "late" : "ok";
  const total = (+qty || 0) * (+price || 0);
  // vehicle for this listing: the suggested one, or a better one the farmer picks (never worse)
  const vSug = preview?.info.suggested;
  const vEff: Storage | undefined = vSug && (vehicle && RANK[vehicle] > RANK[vSug] ? vehicle : vSug);
  const vRaised = !!vSug && !!vEff && vEff !== vSug;

  async function submit() {
    setBusy(true); setError(""); setFields({});
    const data = {
      ...(productBody ?? {}), category,
      quantityKg: +qty, pricePerKg: +price, harvestDate: harvest + "T06:00:00", description: description || undefined,
      scope: scope ?? "DISTRICT", vehicleNeed: vRaised ? vEff : null, targetUpazilaIds: tUp, targetDistrictIds: tDist, mode,
      ...(mode === "BID" ? { bidEndsAt: end?.toISOString(), minIncrement: +inc || 0.5, buyNowPrice: buyNow ? +buyNow : null } : { minOrderKg: minOrder ? +minOrder : null, minResponseHours: +minReply }),
    };
    try {
      let r: { listing: Listing; warning?: string };
      if (edit) r = await api("/listings/" + edit.id, { method: "PUT", body: data });
      else {
        const fd = new FormData();
        fd.append("data", JSON.stringify(data));
        for (const f of photos) fd.append("photos", await shrink(f));
        const res = await fetch("/api/listings", { method: "POST", body: fd, credentials: "include" });
        const j = await res.json();
        if (!res.ok) throw new ApiError(j.error ?? "Could not save.", res.status, j.fields);
        r = j;
      }
      toast((edit ? "Listing updated. " : `Listing ${r.listing.code} is live. `) + (r.warning ?? ""));
      router.push("/farmer/sales?l=" + r.listing.id);
    } catch (e) {
      if (e instanceof ApiError) { setError(e.message); setFields(e.fields); } else setError("Could not reach the server.");
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const toggle = (arr: number[], set: (x: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <div className="grid g-main">
      <div className="panel">
        {error && <div className="note bad" style={{ margin: 16 }}>{error}</div>}

        <div className="step"><b>1</b><div>
          <h4>What are you selling</h4>
          <div className="row">
            <div className="field"><label htmlFor="cat">Category</label>
              <select id="cat" value={category} onChange={(e) => { setCategory(e.target.value); setProductId(0); }}><option>Vegetable</option><option>Fruit</option></select></div>
            <div className="field"><label htmlFor="prod">Product</label>
              <select id="prod" value={productId} onChange={(e) => setProductId(e.target.value === "custom" ? "custom" : +e.target.value)} className={fields.productId ? "bad" : ""}>
                <option value={0}>Choose…</option>
                {list.map((p) => <option key={p.id} value={p.id}>{p.nameEn} · {p.nameBn}</option>)}
                <option value="custom">Not in the list…</option>
              </select><FieldErr e={fields.productId} /></div>
          </div>
          {productId === "custom" && (
            <div className="row3">
              <div className="field"><label htmlFor="cn">Product name</label><input id="cn" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
              <div className="field"><label htmlFor="cs">Shelf life (days)</label><input id="cs" type="number" min={1} value={custom.shelf} onChange={(e) => setCustom({ ...custom, shelf: e.target.value })} /></div>
              <div className="field"><label htmlFor="cv">Vehicle needed for nationwide</label><select id="cv" value={custom.storage} onChange={(e) => setCustom({ ...custom, storage: e.target.value as Storage })}><option value="NORMAL">Normal</option><option value="VENTILATED">Ventilated</option><option value="REFRIGERATED">Refrigerated</option></select></div>
            </div>
          )}
          {preview && <div className="note" style={{ marginBottom: 12 }}><b>{preview.info.name}</b> keeps about <b>{preview.info.shelf} days</b> after harvest · vehicle: {preview.info.longTrip === "NORMAL" ? <b>Normal</b> : <><b>Normal</b> within upazila/district, <b>{STORAGE_LABEL[preview.info.longTrip].toLowerCase()}</b> for nationwide</>}{productId === "custom" ? " (your values)" : ""}.</div>}
        </div></div>

        <div className="step"><b>2</b><div>
          <h4>Quantity, price and harvest</h4>
          <div className="row3">
            <div className="field"><label htmlFor="q">Quantity (kg)</label><input id="q" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={fields.quantityKg ? "bad" : ""} /><FieldErr e={fields.quantityKg} /></div>
            <div className="field"><label htmlFor="p">{mode === "BID" ? "Base price (৳/kg)" : "Asking price (৳/kg)"}</label><input id="p" type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} className={fields.pricePerKg ? "bad" : ""} /><FieldErr e={fields.pricePerKg} />{mode === "BID" && <small>Bids cannot go below this</small>}</div>
            <div className="field"><label htmlFor="h">Harvest date</label><input id="h" type="date" value={harvest} onChange={(e) => setHarvest(e.target.value)} className={fields.harvestDate ? "bad" : ""} /><FieldErr e={fields.harvestDate} /><small>You can list before harvesting</small></div>
          </div>
          <div className="field"><label htmlFor="d">Description <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><textarea id="d" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Variety, size, how it is packed…" /></div>
          {!edit && (
            <div className="field"><label>Photos <span className="muted" style={{ fontWeight: 400 }}>(up to 4, JPG/PNG/WebP, 5 MB each)</span></label>
              <div className="photos">
                {photos.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} style={{ position: "relative", padding: 0, overflow: "hidden" }}><img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, border: 0, borderRadius: 3, background: "rgba(0,0,0,.55)", color: "#fff", cursor: "pointer", fontSize: 11 }}>✕</button></div>
                ))}
                {photos.length < 4 && <label className="add" style={{ width: 86, height: 66, display: "grid", placeItems: "center" }}>+ Add<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { setPhotos([...photos, ...Array.from(e.target.files ?? [])].slice(0, 4)); e.target.value = ""; }} /></label>}
              </div></div>
          )}
        </div></div>

        <div className="step"><b>3</b><div>
          <h4>Who can see this listing</h4>
          {preview && <div className="note good" style={{ marginBottom: 12 }}><b>Suggestion: {SCOPE_LABEL[preview.suggestion.scope]}.</b> {preview.suggestion.why} You can choose differently.</div>}
          <div className="choice" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {(["UPAZILA", "DISTRICT", "NATION"] as Scope[]).map((s) => (
              <div key={s}><input type="radio" name="scope" id={"sc-" + s} checked={scope === s} onChange={() => { setScope(s); setScopeTouched(true); }} />
                <label htmlFor={"sc-" + s}><b>{SCOPE_LABEL[s]}</b><small>{s === "UPAZILA" ? `Dealers in ${nearby?.upazila?.name ?? "your upazila"} and the neighbouring upazilas you tick` : s === "DISTRICT" ? `Dealers in ${nearby?.district?.name ?? "your district"} and the nearby districts you tick` : "Dealers in every district"}</small></label></div>
            ))}
          </div>
          {scope === "UPAZILA" && nearby && (
            <div className="field"><label>Neighbouring upazilas <a href="#" className="small" style={{ marginLeft: 6, fontWeight: 400 }} onClick={(e) => { e.preventDefault(); setTUp(nearby.neighbourUpazilas.map((u) => u.id)); }}>Tick all</a></label>
              <div className="checks">{nearby.neighbourUpazilas.map((u) => <label key={u.id}><input type="checkbox" checked={tUp.includes(u.id)} onChange={() => toggle(tUp, setTUp, u.id)} />{u.name}</label>)}</div>
              <small>Good for small lots and short shelf life: buyers are close, so a pickup or normal vehicle is enough.</small></div>
          )}
          {scope === "DISTRICT" && nearby && (
            <>
              <div className="field"><label>Nearby districts <span className="muted" style={{ fontWeight: 400 }}>(count as within district)</span></label>
                <div className="checks">{nearby.neighbourDistricts.map((d) => <label key={d.id}><input type="checkbox" checked={tDist.includes(d.id)} onChange={() => toggle(tDist, setTDist, d.id)} />{d.name}</label>)}</div></div>
              <div className="field"><label htmlFor="od">Other targeted districts <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <select id="od" value="" onChange={(e) => { const id = +e.target.value; if (id && !tDist.includes(id)) setTDist([...tDist, id]); }}>
                  <option value="">Add a district…</option>
                  {nearby.otherDistricts.filter((d) => !nearby.neighbourDistricts.some((n) => n.id === d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="checks" style={{ marginTop: 6 }}>{tDist.filter((id) => !nearby.neighbourDistricts.some((n) => n.id === id)).map((id) => <label key={id}><input type="checkbox" checked onChange={() => toggle(tDist, setTDist, id)} />{nearby.otherDistricts.find((d) => d.id === id)?.name}</label>)}</div></div>
            </>
          )}
          {preview && vSug && vEff && (
            <div className="field"><label htmlFor="vn">Vehicle for this listing</label>
              <select id="vn" value={vEff} onChange={(e) => setVehicle(e.target.value as Storage)}>
                {STORAGES.filter((s) => RANK[s] >= RANK[vSug]).map((s) => <option key={s} value={s}>{STORAGE_LABEL[s]}{s === vSug ? " (suggested)" : ""}</option>)}
              </select>
              <small>{scope === "NATION"
                ? (vSug === "NORMAL" ? "A normal vehicle is fine nationwide. You can ask for a better one." : `Nationwide needs at least a ${STORAGE_LABEL[vSug].toLowerCase()} vehicle. You can ask for a better one, not a lower one.`)
                : "Within upazila/district a normal vehicle is enough. Choose a better one if your produce needs it, for example in hot weather."}</small></div>
          )}
          {vRaised && vEff && <div className="note warn" style={{ marginBottom: 12 }}>Only transporters with a <b>{STORAGE_LABEL[vEff].toLowerCase()}</b> vehicle can make offers. You may get fewer offers, and transport may cost the dealer more.</div>}
          {preview?.season.risk && vEff === "NORMAL" && preview.info.shelf <= 7 && <div className="note" style={{ marginBottom: 12 }}>Harvest falls in <b>{preview.season.name}</b> ({preview.season.months}): heat can spoil {preview.info.name.toLowerCase()} in a normal vehicle. A ventilated vehicle is safer. This is only a suggestion.</div>}
        </div></div>

        <div className="step"><b>4</b><div>
          <h4>How do you want to sell</h4>
          <div className="choice">
            <div><input type="radio" name="mode" id="m-bid" checked={mode === "BID"} onChange={() => setMode("BID")} /><label htmlFor="m-bid"><b>Open bidding</b><small>Dealers bid for the whole lot. The highest bid wins automatically when bidding ends.</small></label></div>
            <div><input type="radio" name="mode" id="m-own" checked={mode === "OWN"} onChange={() => setMode("OWN")} /><label htmlFor="m-own"><b>My own price</b><small>Dealers send offers with quantity and price. You accept, reject or counter once.</small></label></div>
          </div>
          {mode === "BID" ? (
            <>
              <div className="row3">
                <div className="field"><label htmlFor="be">Bidding ends</label><input id="be" type="datetime-local" value={bidEnd} onChange={(e) => { setBidEnd(e.target.value); setBidEndTouched(true); }} className={fields.bidEndsAt ? "bad" : ""} /><FieldErr e={fields.bidEndsAt} /></div>
                <div className="field"><label htmlFor="inc">Minimum raise (৳/kg)</label><input id="inc" type="number" min={0.5} step="0.5" value={inc} onChange={(e) => setInc(e.target.value)} /><FieldErr e={fields.minIncrement} /></div>
                <div className="field"><label htmlFor="bn">Buy Now price (৳/kg) <span className="muted" style={{ fontWeight: 400 }}>optional</span></label><input id="bn" type="number" min={0} step="0.5" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} className={fields.buyNowPrice ? "bad" : ""} /><FieldErr e={fields.buyNowPrice} /><small>A dealer paying this gets the whole lot at once</small></div>
              </div>
              {w && (
                <div className={"note " + (endState === "ok" ? "good" : endState === "late" ? "warn" : endState === "short" ? "bad" : "")} style={{ marginBottom: 12 }}>
                  Safe window: from <b>{dateTime(w.min)}</b> to <b>{dateTime(w.latestSafe)}</b>. Suggested: <b>{dateTime(w.recommended)}</b> (about a day before harvest, so pickup is on harvest day).
                  {endState === "short" && <> Bidding must run at least {scope === "NATION" ? 24 : 12} hours.</>}
                  {endState === "late" && <> Ending this late, the produce may reach the dealer with less than 40% of its shelf life left. You can still choose it.</>}
                  {w.tooShort && <> The shelf life is short for this area: consider a smaller area or your own price.</>}
                  {" "}<a href="#" onClick={(e) => { e.preventDefault(); setBidEnd(toLocalInput(new Date(w.recommended))); setBidEndTouched(true); }}>Use suggested</a>
                </div>
              )}
            </>
          ) : (
            <div className="row">
              <div className="field"><label htmlFor="mo">Minimum order (kg) <span className="muted" style={{ fontWeight: 400 }}>optional</span></label><input id="mo" type="number" min={1} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} /><FieldErr e={fields.minOrderKg} /></div>
              <div className="field"><label htmlFor="mr">Dealers must give me at least</label><select id="mr" value={minReply} onChange={(e) => setMinReply(e.target.value)}><option value="2">2 hours to reply</option><option value="6">6 hours to reply</option><option value="12">12 hours to reply</option><option value="24">24 hours to reply</option></select><FieldErr e={fields.minResponseHours} /></div>
            </div>
          )}
        </div></div>
      </div>

      <div className="panel" style={{ position: "sticky", top: 16 }}>
        <h3>Summary</h3>
        <div className="pb">
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}>
            <dt>Product</dt><dd>{preview?.info.name ?? "—"}</dd>
            <dt>Quantity</dt><dd>{qty ? kg(+qty) : "—"}</dd>
            <dt>{mode === "BID" ? "Base price" : "Asking"}</dt><dd>{price ? tk(+price) + " / kg" : "—"}</dd>
            <dt>Value</dt><dd>{total ? tk0(total) : "—"}</dd>
            <dt>Harvest</dt><dd>{harvest ? new Date(harvest).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</dd>
            <dt>Visible to</dt><dd>{scope ? SCOPE_LABEL[scope] : "—"}{scope === "UPAZILA" && tUp.length ? ` + ${tUp.length} upazila${tUp.length > 1 ? "s" : ""}` : ""}{scope === "DISTRICT" && tDist.length ? ` + ${tDist.length} district${tDist.length > 1 ? "s" : ""}` : ""}</dd>
            <dt>Vehicle</dt><dd>{vEff ? STORAGE_LABEL[vEff] + (vRaised ? " (your choice)" : "") : "—"}</dd>
            <dt>Selling</dt><dd>{mode === "BID" ? "Open bidding" : "Own price + offers"}</dd>
            {mode === "BID" && end && <><dt>Ends</dt><dd>{dateTime(end)}</dd></>}
            {mode === "BID" && buyNow && <><dt>Buy Now</dt><dd>{tk(+buyNow)} / kg</dd></>}
          </dl>
          <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy || !productBody || !qty || !price} onClick={submit}>{busy ? "Saving…" : edit ? "Save changes" : "Publish listing"}</button>
          <p className="small muted" style={{ marginTop: 8 }}>You can edit or withdraw it until the first bid or offer arrives.</p>
        </div>
      </div>
    </div>
  );
}
