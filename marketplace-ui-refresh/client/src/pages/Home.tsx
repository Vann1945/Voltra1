/**
 * Design system: Kebun Terukur — marketplace editorial dengan ritme informasi cepat,
 * aksen Bata Senja, dan motion ringan yang hanya memperjelas perpindahan state.
 */
import { RatingInput } from "@/components/RatingInput";
import { toast } from "sonner";
import {
  ArrowDownUp,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Compass,
  House,
  LogOut,
  MapPin,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Listing = {
  id: string;
  title: string;
  type: "Ruang kerja" | "Acara kecil" | "Menginap";
  location: string;
  price: string;
  image: string;
  availability: string;
};

const listingData: Listing[] = [
  {
    id: "paviliun-banyu",
    title: "Paviliun Banyu",
    type: "Menginap",
    location: "Lembang, Bandung Barat",
    price: "Rp420.000 / malam",
    image: "https://market-ui-np2kpldz.manus.space/manus-storage/listing-cabin_1de97913.jpg",
    availability: "Tersedia akhir pekan ini",
  },
  {
    id: "studio-meranti",
    title: "Studio Meranti",
    type: "Ruang kerja",
    location: "Ciumbuleuit, Bandung",
    price: "Rp85.000 / jam",
    image: "https://market-ui-np2kpldz.manus.space/manus-storage/listing-studio_9c9704c3.jpg",
    availability: "Tersedia hari ini",
  },
  {
    id: "ruang-salak",
    title: "Ruang Salak",
    type: "Acara kecil",
    location: "Batu, Jawa Timur",
    price: "Rp650.000 / sesi",
    image: "https://market-ui-np2kpldz.manus.space/manus-storage/listing-workshop_40f563a7.jpg",
    availability: "Tersedia besok",
  },
];

const filters = ["Semua", "Dekat saya", "Ruang kerja", "Acara kecil"] as const;
type Filter = (typeof filters)[number];

const formatScore = (score: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(score);

const parseScore = (input: string) => {
  const normalized = input.trim().replace(",", ".");
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const score = Number(normalized);
  return score >= 0 && score <= 5 ? score : null;
};

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Semua");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState<Listing | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Listing | null>(null);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const visibleListings = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");

    return listingData.filter((listing) => {
      const matchesSearch =
        !needle ||
        [listing.title, listing.type, listing.location]
          .join(" ")
          .toLocaleLowerCase("id-ID")
          .includes(needle);
      const matchesFilter =
        activeFilter === "Semua" ||
        (activeFilter === "Dekat saya" && listing.location.includes("Bandung")) ||
        listing.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, query]);

  useEffect(() => {
    const hasLayer = menuOpen || Boolean(detail) || Boolean(reviewTarget);
    document.body.style.overflow = hasLayer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detail, menuOpen, reviewTarget]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setDetail(null);
      setReviewTarget(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const openReview = (listing: Listing) => {
    setDetail(null);
    setMenuOpen(false);
    setReviewTarget(listing);
    setReviewInput(myRatings[listing.id] ? formatScore(myRatings[listing.id]) : "");
    setReviewError("");
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewTarget) return;
    const score = parseScore(reviewInput);

    if (score === null) {
      setReviewError("Masukkan angka dari 0,00 hingga 5,00, misalnya 4,8.");
      return;
    }

    setMyRatings((current) => ({ ...current, [reviewTarget.id]: score }));
    navigator.vibrate?.(18);
    toast.success(`Skor ${formatScore(score)} tersimpan untuk ${reviewTarget.title}.`);
    setReviewTarget(null);
    setReviewError("");
  };

  const toggleSaved = (listing: Listing) => {
    setSavedIds((current) => {
      const isSaved = current.includes(listing.id);
      toast(isSaved ? `${listing.title} dihapus dari tersimpan.` : `${listing.title} disimpan.`);
      return isSaved ? current.filter((id) => id !== listing.id) : [...current, listing.id];
    });
  };

  const jumpToExplore = () => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="market-shell">
      <aside className="desktop-rail" aria-label="Navigasi utama">
        <button className="brand-lockup" onClick={jumpToExplore} aria-label="Ke halaman eksplorasi">
          <img src="https://market-ui-np2kpldz.manus.space/manus-storage/marketplace-mark_dfed934f.png" alt="" className="brand-mark" />
          <span className="brand-wordmark"><span>ruang</span><i>kita</i></span>
        </button>
        <nav className="rail-navigation">
          <p className="rail-label">JELAJAHI RUANG</p>
          <button className="rail-link is-active" onClick={jumpToExplore}>
            <Compass size={19} /> Eksplorasi
          </button>
          <button className="rail-link" onClick={() => { setActiveFilter("Dekat saya"); jumpToExplore(); }}>
            <MapPin size={19} /> Dekat saya
          </button>
          <button className="rail-link" onClick={() => { setActiveFilter("Ruang kerja"); jumpToExplore(); }}>
            <House size={19} /> Ruang kerja
          </button>
          <button className="rail-link" onClick={() => { setActiveFilter("Acara kecil"); jumpToExplore(); }}>
            <CalendarDays size={19} /> Acara kecil
          </button>
        </nav>
        <div className="rail-bottom">
          <button className="rail-account-button" onClick={() => setMenuOpen(true)}>
            <UserRound size={18} /> Akun & ruang Anda
          </button>
          <p>Persempit pilihan lewat kategori yang paling relevan.</p>
        </div>
      </aside>

      <main className="market-main">
        <header className="market-topbar">
          <button className="mobile-brand" onClick={jumpToExplore} aria-label="Ke halaman eksplorasi">
            <img src="https://market-ui-np2kpldz.manus.space/manus-storage/marketplace-mark_dfed934f.png" alt="" className="brand-mark" />
            <span className="brand-wordmark"><span>ruang</span><i>kita</i></span>
          </button>
          <div className="topbar-context">
            <span className="context-dot" />
            <span>Jawa Barat</span>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
          <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Buka menu akun">
            <Menu size={21} />
          </button>
        </header>

        <section className="search-rail" aria-label="Cari ruang">
          <label className="search-control">
            <Search size={19} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari ruang, area, atau kebutuhan"
              aria-label="Cari ruang, area, atau kebutuhan"
            />
          </label>
          <button className="filter-icon-button" aria-label="Atur filter" onClick={() => toast("Filter cepat siap dipilih di bawah kolom pencarian.") }>
            <SlidersHorizontal size={19} />
          </button>
        </section>

        <section className="hero-layout" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> PILIH DENGAN TENANG</div>
            <h1 id="hero-heading">Ruang yang terasa tepat untuk rencana Anda.</h1>
            <p>Bandingkan pilihan dengan cepat, simpan yang menarik, lalu beri penilaian dengan skor yang presisi.</p>
            <div className="hero-actions">
              <button className="primary-action" onClick={jumpToExplore}>
                Jelajahi ruang <ArrowUpRight size={18} />
              </button>
              <button className="text-action" onClick={() => setMenuOpen(true)}>
                Kelola ruang Anda
              </button>
            </div>
          </div>
          <div className="hero-photo-wrap">
            <img
              src="https://market-ui-np2kpldz.manus.space/manus-storage/marketplace-hero-garden_0a1b2555.jpg"
              alt="Area taman tropis untuk berkumpul"
              className="hero-photo"
            />
            <div className="hero-photo-caption">
              <span>Kurasi ruang</span>
              <strong>Untuk kerja, jeda, dan pertemuan.</strong>
            </div>
          </div>
        </section>

        <section id="explore" className="explore-section" aria-labelledby="explore-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">PILIHAN RUANG</p>
              <h2 id="explore-heading">Cari yang sesuai ritme Anda.</h2>
            </div>
            <button className="sort-button" onClick={() => toast("Urutan saat ini: rekomendasi terdekat.") }>
              <ArrowDownUp size={16} /> Urutkan
            </button>
          </div>

          <div className="filter-scroll" role="tablist" aria-label="Filter ruang">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`filter-pill ${activeFilter === filter ? "is-active" : ""}`}
                onClick={() => setActiveFilter(filter)}
                role="tab"
                aria-selected={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="listing-grid">
            {visibleListings.map((listing, index) => {
              const rating = myRatings[listing.id];
              const isSaved = savedIds.includes(listing.id);
              return (
                <article className="listing-card" key={listing.id} style={{ animationDelay: `${index * 55}ms` }}>
                  <button
                    className="listing-image-button"
                    onClick={() => setDetail(listing)}
                    aria-label={`Lihat detail ${listing.title}`}
                  >
                    <img src={listing.image} alt="" className="listing-image" />
                    <span className="listing-badge">{listing.type}</span>
                  </button>
                  <div className="listing-body">
                    <div className="listing-title-row">
                      <button className="listing-title" onClick={() => setDetail(listing)}>{listing.title}</button>
                      <button
                        className={`save-button ${isSaved ? "is-saved" : ""}`}
                        onClick={() => toggleSaved(listing)}
                        aria-label={isSaved ? `Hapus ${listing.title} dari tersimpan` : `Simpan ${listing.title}`}
                      >
                        <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <p className="listing-location"><MapPin size={15} />{listing.location}</p>
                    <div className="listing-meta">
                      <strong>{listing.price}</strong>
                      <span>{listing.availability}</span>
                    </div>
                    <div className="rating-row">
                      {rating !== undefined ? (
                        <span className="rating-present"><Star size={15} fill="currentColor" /> <b>{formatScore(rating)}</b> <small>nilai Anda</small></span>
                      ) : (
                        <span className="rating-empty">Belum dinilai</span>
                      )}
                      <button className="rate-link" onClick={() => openReview(listing)}>{rating !== undefined ? "Ubah nilai" : "Nilai ruang"}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleListings.length === 0 ? (
            <div className="empty-state">
              <Search size={22} />
              <div>
                <strong>Belum ada ruang yang cocok.</strong>
                <p>Coba kata kunci lain atau hapus filter yang aktif.</p>
              </div>
              <button onClick={() => { setQuery(""); setActiveFilter("Semua"); }}>Reset pencarian</button>
            </div>
          ) : null}
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Navigasi bawah">
        <button className="mobile-nav-link is-active" onClick={jumpToExplore}><Compass size={20} /><span>Eksplor</span></button>
        <button className="mobile-nav-link" onClick={() => toast("Daftar tersimpan akan muncul di sini.") }><Bookmark size={20} /><span>Tersimpan</span></button>
        <button className="mobile-nav-link" onClick={() => setMenuOpen(true)}><Menu size={20} /><span>Menu</span></button>
      </nav>

      {menuOpen ? (
        <div className="layer-backdrop" onClick={() => setMenuOpen(false)}>
          <section className="account-sheet layer-surface-enter" aria-label="Menu ruang Anda" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" aria-hidden="true" />
              <div className="sheet-title-row">
                <div>
                  <p className="sheet-eyebrow">RUANG ANDA</p>
                  <h2>Akses cepat, tanpa berdesakan.</h2>
                </div>
                <button className="close-sheet" onClick={() => setMenuOpen(false)} aria-label="Tutup menu"><X size={22} /></button>
              </div>
              <button className="profile-compact" onClick={() => toast("Profil Anda siap untuk diperbarui.") }>
                <span className="profile-initial">RK</span>
                <span><strong>RuangKita</strong><small>Kelola profil dan preferensi</small></span>
                <ArrowUpRight size={18} />
              </button>
              <div className="sheet-divider" />
              <div className="sheet-actions">
                <button className="sheet-primary" onClick={() => toast("Form unggah ruang akan dibuka pada alur berikutnya.") }><Plus size={20} /> Tambah ruang <ArrowUpRight size={18} /></button>
                <button className="sheet-row" onClick={() => toast("Aktivitas terbaru akan tampil di sini.") }><CalendarDays size={20} /> Aktivitas <ArrowUpRight size={18} /></button>
                <button className="sheet-row" onClick={() => toast("Pengaturan siap dibuka.") }><Settings2 size={20} /> Pengaturan <ArrowUpRight size={18} /></button>
              </div>
              <button className="sign-out-button" onClick={() => toast("Anda tetap aman—aksi keluar memerlukan konfirmasi pada alur akun.") }><LogOut size={19} /> Keluar</button>
          </section>
        </div>
      ) : null}

      {detail ? (
        <div className="layer-backdrop" onClick={() => setDetail(null)}>
          <section className="detail-sheet layer-surface-enter" aria-label={`Detail ${detail.title}`} onClick={(event) => event.stopPropagation()}>
              <button className="close-float" onClick={() => setDetail(null)} aria-label="Tutup detail"><X size={21} /></button>
              <img src={detail.image} alt="" className="detail-image" />
              <div className="detail-content">
                <span className="listing-badge detail-badge">{detail.type}</span>
                <h2>{detail.title}</h2>
                <p className="listing-location"><MapPin size={15} />{detail.location}</p>
                <p className="detail-description">Satu ruang yang dirancang agar rencana kecil terasa lebih mudah dijalankan. Ketersediaan dan keputusan penting ditampilkan ringkas pada langkah berikutnya.</p>
                <div className="detail-info-row"><strong>{detail.price}</strong><span>{detail.availability}</span></div>
                <div className="detail-actions">
                  <button className="secondary-action" onClick={() => toggleSaved(detail)}><Bookmark size={18} /> {savedIds.includes(detail.id) ? "Tersimpan" : "Simpan"}</button>
                  <button className="primary-action" onClick={() => openReview(detail)}><MessageSquareText size={18} /> Beri nilai</button>
                </div>
              </div>
          </section>
        </div>
      ) : null}

      {reviewTarget ? (
        <div className="layer-backdrop" onClick={() => setReviewTarget(null)}>
          <form className="review-dialog layer-dialog-enter" onSubmit={submitReview} onClick={(event) => event.stopPropagation()}>
              <div className="review-dialog-header">
                <div>
                  <p className="sheet-eyebrow">PENILAIAN PRIBADI</p>
                  <h2>Nilai {reviewTarget.title}</h2>
                </div>
                <button type="button" className="close-sheet" onClick={() => setReviewTarget(null)} aria-label="Tutup formulir"><X size={21} /></button>
              </div>
              <p className="review-intro">Skor tersimpan pada sesi ini dan akan menggantikan penilaian Anda sebelumnya untuk ruang yang sama.</p>
              <RatingInput value={reviewInput} onChange={(value) => { setReviewInput(value); setReviewError(""); }} error={reviewError} />
              <div className="review-actions">
                <button type="button" className="cancel-action" onClick={() => setReviewTarget(null)}>Batal</button>
                <button type="submit" className="primary-action">Simpan skor</button>
              </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
