// ============================================================
// DAFTAR SKIN DAN HARGANYA
// Ubah angka `price` di sini untuk mengatur harga (satuan: koin).
// Setelah diedit, commit ke GitHub dan Vercel otomatis deploy ulang.
//
// Menambah skin baru:
// 1. Taruh gambar (png/svg/webp) di folder web/public/skins/
// 2. Tambahkan baris baru di bawah dengan `image: '/skins/namafile.png'`
//    (id harus unik, huruf kecil dan underscore saja)
//
// Skin tanpa `image` digambar oleh kode (lihat `look`).
// Skin default (price 0) otomatis dimiliki semua akun yang login.
// ============================================================

export const DEFAULT_SKIN = 'mas_hitam';

export const SKINS = [
  { id: 'white', name: 'Si White jir', price: 0, image: '/skins/white.png' },
  { id: 'Amongus_jir', name: 'Amongus', price: 420, image: '/skins/amongus1.png' },
  { id: 'ajg_ngeri', name: 'Ajggg', price: 666, image: '/skins/ajg.png' },
  // Contoh skin dengan gambar sendiri (hapus tanda // untuk mengaktifkan):
  // { id: 'skin_saya', name: 'Skin Saya', price: 120, image: '/skins/skin_saya.png' },
];

export function findSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
