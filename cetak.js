/* ===== CETAK BORANG RASMI =====
   Bukan cetak skrin — HTML borang dibina khas, dimasukkan ke #print-area,
   dan hanya bahagian itu keluar bila ditekan Cetak / Simpan sebagai PDF. */
const SEKOLAH = { nama: 'SMK BATU MAUNG', alamat: '11960 Batu Maung, Pulau Pinang', logo: 'logo.jpg' };

const prTarikh = iso => {
  if (!iso) return '-';
  const d = String(iso).slice(0, 10);
  try { return new Date(d + 'T00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return d; }
};
const prMasaKini = () => new Date().toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function prKepala(tajuk, sub) {
  return `<div class="pr-head">
    <img src="${SEKOLAH.logo}" alt="">
    <div><div class="pr-school">${esc(SEKOLAH.nama)}</div>
      <div class="pr-addr">${esc(SEKOLAH.alamat)}</div>
      <div class="pr-title">${esc(tajuk)}</div>
      ${sub ? `<div class="pr-addr">${esc(sub)}</div>` : ''}</div>
  </div>`;
}
function prButiran(s, extra) {
  return `<table class="pr-meta">
    <tr><td class="k">Nama Murid</td><td class="v"><b>${esc(s.name)}</b></td>
        <td class="k">No. Kad Pengenalan</td><td class="v">${esc(s.nokp || '-')}</td></tr>
    <tr><td class="k">Kelas</td><td class="v">${esc(s.kelas || '-')}</td>
        <td class="k">Tarikh Cetak</td><td class="v">${esc(prMasaKini())}</td></tr>
    ${extra || ''}
  </table>`;
}
function prTandatangan(kiri, kanan) {
  return `<div class="pr-sign">
    <div><div class="ln"></div>${esc(kiri)}<br><span class="pr-addr">Nama &amp; Cop:</span></div>
    <div><div class="ln"></div>${esc(kanan)}<br><span class="pr-addr">Tarikh:</span></div>
  </div>`;
}
function prKaki() {
  return `<div class="pr-foot">Dijana oleh Sistem Kehadiran ${esc(SEKOLAH.nama)} · ${esc(prMasaKini())}</div>`;
}

/* Papar borang & buka dialog cetak. Kandungan dibuang semula selepas selesai. */
function cetakDoc(html) {
  const area = document.getElementById('print-area');
  if (!area) { toast('Ruang cetak tiada'); return; }
  area.innerHTML = html;
  document.body.classList.add('printing-form');
  let selesai = false;
  const done = () => {
    if (selesai) return;
    selesai = true;
    document.body.classList.remove('printing-form');
    area.innerHTML = '';
  };
  window.addEventListener('afterprint', done, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(() => window.addEventListener('focus', done, { once: true }), 300);
    setTimeout(done, 60000);                       // jaring keselamatan
  }, 80);
}

/* ---------- BORANG 1: rekod kesalahan disiplin seorang murid ---------- */
function cetakBorangKesalahan(s, list) {
  list = (list || []).slice().sort((a, b) => String(b.odate || '').localeCompare(String(a.odate || '')));
  const byType = {};
  list.forEach(o => { byType[o.offence_type] = (byType[o.offence_type] || 0) + 1; });
  const ringkas = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${esc(t)} (${n})`).join(' · ');

  cetakDoc(`
    ${prKepala('Borang Rekod Kesalahan Disiplin Murid', 'Unit Hal Ehwal Murid')}
    ${prButiran(s, `<tr><td class="k">Jumlah Kesalahan</td><td class="v"><b>${list.length}</b> rekod</td>
        <td class="k">Ringkasan</td><td class="v">${ringkas || '-'}</td></tr>`)}
    ${list.length ? `<table class="pr-tbl">
      <tr><th style="width:34px">Bil</th><th style="width:96px">Tarikh Kesalahan</th><th>Jenis Kesalahan</th>
          <th>Catatan</th><th style="width:120px">Direkod Oleh</th><th style="width:96px">Tarikh Direkod</th></tr>
      ${list.map((o, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(prTarikh(o.odate))}</td>
        <td><b>${esc(o.offence_type || '-')}</b></td>
        <td>${esc(o.note || '-')}</td>
        <td>${esc(o.recorded_name || '-')}</td>
        <td>${esc(o.created_at ? prTarikh(o.created_at) : '-')}</td></tr>`).join('')}
    </table>` : `<div class="pr-none">Tiada rekod kesalahan disiplin bagi murid ini.</div>`}
    <div class="pr-note">Borang ini adalah rekod rasmi kesalahan disiplin murid seperti yang direkodkan dalam Sistem Kehadiran sekolah.
      Sebarang tindakan susulan hendaklah dibuat mengikut Peraturan Sekolah dan garis panduan Kementerian Pendidikan Malaysia.</div>
    ${prTandatangan('Guru Disiplin / Penolong Kanan HEM', 'Ibu Bapa / Penjaga')}
    ${prKaki()}`);
}

/* ---------- BORANG 2: profil penuh murid ---------- */
function cetakBorangProfil(s, d) {
  const abs = (d.absen || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const off = (d.offences || []).slice().sort((a, b) => String(b.odate || '').localeCompare(String(a.odate || '')));
  const hk = (d.hukuman || []).slice();
  const pct = d.total > 0 ? Math.round((d.total - abs.length) / d.total * 100) : null;

  cetakDoc(`
    ${prKepala('Profil Murid', 'Kehadiran · Disiplin · Tindakan HEM')}
    ${prButiran(s, `<tr><td class="k">Kehadiran</td>
        <td class="v">${d.total > 0 ? `Hadir <b>${d.total - abs.length}/${d.total}</b> sesi${pct != null ? ` (<b>${pct}%</b>)` : ''}` : 'Belum ada sesi direkod'}</td>
        <td class="k">Rekod Disiplin</td><td class="v"><b>${off.length}</b> kesalahan · <b>${hk.length}</b> tindakan</td></tr>`)}

    <div class="pr-sec">A. Rekod Tidak Hadir</div>
    ${abs.length ? `<table class="pr-tbl">
      <tr><th style="width:34px">Bil</th><th style="width:96px">Tarikh</th><th>Subjek</th><th style="width:96px">Masa</th><th style="width:130px">Guru Merekod</th><th style="width:120px">Sebab</th></tr>
      ${abs.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(prTarikh(a.date))}</td><td>${esc(a.subject || '-')}</td>
        <td>${esc(a.masa ? fmtMasa(a.masa) : '-')}</td><td>${esc(a.cikgu || '-')}</td><td>${esc(a.reason || '-')}</td></tr>`).join('')}
    </table>` : `<div class="pr-none">Tiada rekod tidak hadir — kehadiran penuh.</div>`}

    <div class="pr-sec">B. Rekod Kesalahan Disiplin</div>
    ${off.length ? `<table class="pr-tbl">
      <tr><th style="width:34px">Bil</th><th style="width:96px">Tarikh Kesalahan</th><th>Jenis Kesalahan</th><th>Catatan</th><th style="width:130px">Direkod Oleh</th></tr>
      ${off.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(prTarikh(o.odate))}</td><td><b>${esc(o.offence_type || '-')}</b></td>
        <td>${esc(o.note || '-')}</td><td>${esc(o.recorded_name || '-')}</td></tr>`).join('')}
    </table>` : `<div class="pr-none">Tiada rekod kesalahan disiplin.</div>`}

    <div class="pr-sec">C. Hukuman / Tindakan HEM</div>
    ${hk.length ? `<table class="pr-tbl">
      <tr><th style="width:34px">Bil</th><th style="width:96px">Tarikh</th><th>Tindakan</th><th>Catatan</th><th style="width:130px">Direkod Oleh</th></tr>
      ${hk.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(prTarikh(x.created_at))}</td><td><b>${esc(x.action || '-')}</b></td>
        <td>${esc(x.note || '-')}</td><td>${esc(x.recorded_name || '-')}</td></tr>`).join('')}
    </table>` : `<div class="pr-none">Tiada rekod hukuman atau tindakan.</div>`}

    ${prTandatangan('Guru Kelas / Guru Disiplin', 'Penolong Kanan HEM')}
    ${prKaki()}`);
}
