import { call } from '../api.js'
import { $, $$, esc, icon, formatDA, toast, busy, drawer, confirmDialog } from '../ui.js'
import { renderUrl } from '../../ui/renders.js'

const MODEL_LABEL = {
  pizza: 'Pizza',
  sandwich: 'Sandwich',
  tacos: 'Tacos',
  fajitas: 'Fajitas (galette)',
  bowl: 'Bol de riz',
  box: 'Box',
  fries: 'Frites',
  juice: 'Jus',
  fruitsalad: 'Salade de fruits',
  waffle: 'Gaufre',
  crepe: 'Crêpe',
}
const TAG_LABEL = { new: 'Nouveau', signature: 'Signature', spicy: 'Piquant', share: 'À partager' }
const TAG_ICON = { new: 'sparkle', signature: 'star', spicy: 'pepper', share: 'users-three' }

const priceText = (it) => (it.sizes?.length ? it.sizes.map((s) => `${esc(s.label)} ${formatDA(s.price)}`).join(' · ') : formatDA(it.price ?? 0))
const clone = (v) => JSON.parse(JSON.stringify(v))

/** Photo allégée avant l'envoi : 1200 px maximum, WebP (ou JPEG si le navigateur ne sait pas faire). */
async function compress(file) {
  let src = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
  if (!src) {
    src = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Cette image n'a pas pu être lue."))
      img.src = URL.createObjectURL(file)
    })
  }
  const k = Math.min(1, 1200 / Math.max(src.width, src.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(src.width * k))
  canvas.height = Math.max(1, Math.round(src.height * k))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.84))
  if (!blob || blob.type !== 'image/webp') {
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#15110e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
  }
  if (!blob) throw new Error("Cette image n'a pas pu être préparée.")
  return blob
}

export default {
  mount(el) {
    const state = { doc: null, base: '', updatedAt: null, cat: 0, supp: false, settings: false }
    const dirty = () => state.doc && JSON.stringify(state.doc) !== state.base
    const cat = () => state.doc.categories[state.cat]

    el.innerHTML = `<header class="head">
  <div><p class="head__kicker">Prix, photos, plats épuisés : le site se met à jour tout seul</p><h1 class="head__title">La <em>carte</em></h1></div>
  <div class="head__actions"><a class="btn btn--ghost" href="../#menu" target="_blank" rel="noopener">${icon('arrow-square-out')}Voir sur le site</a></div>
</header>
<div class="editor" data-editor><div class="skeleton" style="height:420px"></div><div class="skeleton" style="height:620px"></div></div>
<div class="savebar" data-savebar hidden>
  <p class="savebar__text">${icon('warning-circle')}<span>Modifications non enregistrées</span></p>
  <button class="btn btn--ghost btn--sm" type="button" data-act="discard">Annuler</button>
  <button class="btn btn--primary" type="button" data-act="save">${icon('floppy-disk')}Enregistrer</button>
</div>`
    const editor = $('[data-editor]', el)

    async function load() {
      try {
        const res = await call('/admin/menu')
        state.doc = res.menu ?? { supplements: [], categories: [] }
        state.base = JSON.stringify(state.doc)
        state.updatedAt = res.updatedAt
        state.cat = Math.min(state.cat, Math.max(0, state.doc.categories.length - 1))
        render()
      } catch (err) {
        editor.innerHTML = `<div class="card empty" style="grid-column:1/-1">${icon('warning-circle')}<strong>Carte indisponible</strong><span>${esc(err.message)}</span><button class="btn btn--ghost" type="button" data-act="reload">Réessayer</button></div>`
      }
    }

    // --- rendu -------------------------------------------------------------------------------------------
    function render() {
      editor.innerHTML = `<nav class="card cats" aria-label="Catégories">${catsHTML()}</nav><section class="card" data-panel>${state.supp ? suppHTML() : panelHTML()}</section>`
      paintSavebar()
    }
    function renderPanel() {
      $('[data-panel]', el).innerHTML = state.supp ? suppHTML() : panelHTML()
      $('.cats', el).innerHTML = catsHTML()
      paintSavebar()
    }
    function paintSavebar() {
      $('[data-savebar]', el).hidden = !dirty()
    }

    function catsHTML() {
      return `<p class="cats__title">Catégories</p>${state.doc.categories
        .map(
          (c, i) =>
            `<button class="cat-btn${c.visible === false ? ' is-hidden' : ''}" type="button" data-cat-i="${i}" aria-current="${!state.supp && i === state.cat}"><span>${esc(c.name || 'Sans nom')}</span><span class="n">${c.items.length}</span></button>`,
        )
        .join('')}
<button class="cat-btn" type="button" data-act="cat-add">${icon('plus')}<span>Nouvelle catégorie</span></button>
<div class="cats__sep"></div>
<button class="cat-btn" type="button" data-act="supp-open" aria-current="${state.supp}"><span>Suppléments</span><span class="n">${state.doc.supplements.length}</span></button>`
    }

    function panelHTML() {
      const c = cat()
      if (!c) return `<div class="empty">${icon('book-open-text')}<strong>Aucune catégorie</strong><button class="btn btn--primary" type="button" data-act="cat-add">${icon('plus')}Créer une catégorie</button></div>`
      const models = Object.entries(MODEL_LABEL)
        .map(([k, l]) => `<option value="${k}"${c.model === k ? ' selected' : ''}>${l}</option>`)
        .join('')
      return `<div class="panel-head">
  <div><h2 data-cat-title>${esc(c.name || 'Sans nom')}</h2><p class="hint">${c.items.length} produit${c.items.length > 1 ? 's' : ''} · ${c.visible === false ? 'masquée du site' : 'visible sur le site'}</p></div>
  <button class="btn btn--ghost btn--sm" type="button" data-act="settings" aria-expanded="${state.settings}">${icon('sliders-horizontal')}Réglages</button>
</div>
<div class="settings-box" data-settings ${state.settings ? '' : 'hidden'}>
  <div class="row">
    <div class="field"><label for="c-name">Nom de la catégorie</label><input class="input" id="c-name" data-cat="name" value="${esc(c.name)}" maxlength="40"></div>
    <div class="field"><label for="c-sing">Nom d'un produit</label><input class="input" id="c-sing" data-cat="singular" value="${esc(c.singular ?? '')}" maxlength="30" placeholder="Ex : Pizza"></div>
  </div>
  <p class="hint" style="margin-top:6px">Le nom d'un produit est ajouté devant chaque plat dans les commandes (« Pizza Margherita »).</p>
  <div class="row" style="margin-top:16px">
    <div class="field"><label for="c-brand">Univers</label><select class="select" id="c-brand" data-cat="brand"><option value="food"${c.brand !== 'juice' ? ' selected' : ''}>Fast food</option><option value="juice"${c.brand === 'juice' ? ' selected' : ''}>AK Juice</option></select></div>
    <div class="field"><label for="c-model">Plat 3D affiché sur le site</label><select class="select" id="c-model" data-cat="model">${models}</select></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:16px 28px;margin-top:18px">
    <label class="switch"><input type="checkbox" data-cat="visible"${c.visible !== false ? ' checked' : ''}><span class="switch__track"></span>Visible sur le site</label>
    <label class="switch"><input type="checkbox" data-cat="supplements"${c.supplements ? ' checked' : ''}><span class="switch__track"></span>Suppléments proposés</label>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px">
    <button class="btn btn--ghost btn--sm" type="button" data-act="cat-up"${state.cat === 0 ? ' disabled' : ''}>${icon('caret-up')}Monter</button>
    <button class="btn btn--ghost btn--sm" type="button" data-act="cat-down"${state.cat === state.doc.categories.length - 1 ? ' disabled' : ''}>${icon('caret-down')}Descendre</button>
    <span style="flex:1"></span>
    <button class="btn btn--danger btn--sm" type="button" data-act="cat-delete">${icon('trash')}Supprimer la catégorie</button>
  </div>
</div>
<div class="items">${c.items.map((it, i) => itemHTML(c, it, i)).join('') || '<p class="hint" style="padding:10px 4px">Aucun produit dans cette catégorie pour le moment.</p>'}</div>
<button class="add-row btn--block" type="button" data-act="item-add">${icon('plus')}Ajouter un produit</button>`
    }

    function itemHTML(c, it, i) {
      const off = it.available === false || it.hidden
      const tags = (it.tags ?? []).map((t) => `<span class="tag">${icon(TAG_ICON[t])}${TAG_LABEL[t]}</span>`).join('')
      return `<div class="item${off ? ' is-off' : ''}" data-item="${i}">
  <img class="thumb${it.image ? '' : ' thumb--render'}" src="${esc(it.image || renderUrl(c.model))}" alt="" width="56" height="56" loading="lazy">
  <button class="item__main" type="button" data-act="item-edit" style="text-align:left">
    <span class="item__name">${esc(it.name)}${it.hidden ? '<span class="tag">Masqué</span>' : ''}${tags}</span>
    <span class="item__meta" style="display:block">${[it.group, it.desc].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</span>
  </button>
  <div class="item__side">
    <span class="item__price">${priceText(it)}</span>
    <label class="switch" title="Disponible ou épuisé"><input type="checkbox" data-act="avail"${it.available !== false ? ' checked' : ''}><span class="switch__track"></span><span class="hint" style="min-width:66px">${it.available !== false ? 'Disponible' : 'Épuisé'}</span></label>
    <button class="icon-btn icon-btn--sm" type="button" data-act="item-edit" aria-label="Modifier ${esc(it.name)}">${icon('pencil-simple')}</button>
    <span class="move"><button type="button" data-act="item-up" aria-label="Monter ${esc(it.name)}"${i === 0 ? ' disabled' : ''}>${icon('caret-up')}</button><button type="button" data-act="item-down" aria-label="Descendre ${esc(it.name)}"${
      i === c.items.length - 1 ? ' disabled' : ''
    }>${icon('caret-down')}</button></span>
  </div>
</div>`
    }

    function suppHTML() {
      return `<div class="panel-head"><div><h2>Suppléments</h2><p class="hint">Proposés sur les catégories où l'option « Suppléments proposés » est activée.</p></div></div>
<div class="stack">${state.doc.supplements
        .map(
          (s, i) => `<div class="supp" data-supp="${i}">
  <input class="input" data-s="label" value="${esc(s.label)}" maxlength="30" placeholder="Nom (ex : Fromage)" aria-label="Nom du supplément">
  <label class="input-icon"><span class="sr-only">Prix en dinars</span><input class="input num" data-s="price" type="number" min="0" step="10" inputmode="numeric" value="${s.price}" style="padding-left:14px;padding-right:38px"><span style="position:absolute;right:14px;top:50%;translate:0 -50%;color:var(--text-3);font-size:13px">DA</span></label>
  <button class="icon-btn icon-btn--danger" type="button" data-act="supp-del" aria-label="Supprimer ${esc(s.label)}">${icon('trash')}</button>
</div>`,
        )
        .join('')}</div>
<button class="add-row btn--block" type="button" data-act="supp-add">${icon('plus')}Ajouter un supplément</button>`
    }

    // --- actions -------------------------------------------------------------------------------------------
    const swap = (arr, i, j) => ([arr[i], arr[j]] = [arr[j], arr[i]])

    el.addEventListener('click', async (e) => {
      const catBtn = e.target.closest('[data-cat-i]')
      if (catBtn) {
        state.cat = Number(catBtn.dataset.catI)
        state.supp = false
        renderPanel()
        if (matchMedia('(max-width: 1100px)').matches) $('[data-panel]', el).scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      const a = e.target.closest('[data-act]')
      if (!a || a.matches('input')) return
      const act = a.dataset.act
      const itemEl = a.closest('[data-item]')
      const i = itemEl ? Number(itemEl.dataset.item) : -1
      const c = state.doc && cat()
      switch (act) {
        case 'reload':
          return load()
        case 'save':
          return busy(a, save)
        case 'discard':
          if (await confirmDialog({ title: 'Annuler les modifications ?', text: 'La carte revient à sa dernière version enregistrée.', confirm: 'Tout annuler', danger: true })) load()
          return
        case 'settings':
          state.settings = !state.settings
          $('[data-settings]', el).hidden = !state.settings
          a.setAttribute('aria-expanded', String(state.settings))
          return
        case 'supp-open':
          state.supp = true
          return renderPanel()
        case 'cat-add':
          state.doc.categories.push({ id: '', name: 'Nouvelle catégorie', singular: '', brand: 'food', model: 'box', supplements: false, visible: true, items: [] })
          state.cat = state.doc.categories.length - 1
          state.supp = false
          state.settings = true
          renderPanel()
          $('#c-name', el)?.select()
          return
        case 'cat-up':
        case 'cat-down': {
          const j = state.cat + (act === 'cat-up' ? -1 : 1)
          swap(state.doc.categories, state.cat, j)
          state.cat = j
          return renderPanel()
        }
        case 'cat-delete': {
          const ok = await confirmDialog({
            title: `Supprimer « ${c.name} » ?`,
            text: c.items.length ? `Ses ${c.items.length} produits seront supprimés aussi. Pour la retirer du site sans la perdre, désactive plutôt « Visible sur le site ».` : '',
            confirm: 'Supprimer',
            danger: true,
          })
          if (!ok) return
          state.doc.categories.splice(state.cat, 1)
          state.cat = Math.max(0, state.cat - 1)
          return renderPanel()
        }
        case 'item-add':
          return editItem(-1)
        case 'item-edit':
          return editItem(i)
        case 'item-up':
        case 'item-down':
          swap(c.items, i, i + (act === 'item-up' ? -1 : 1))
          return renderPanel()
        case 'supp-add':
          state.doc.supplements.push({ id: '', label: '', price: 0 })
          renderPanel()
          $$('[data-s="label"]', el).at(-1)?.focus()
          return
        case 'supp-del':
          state.doc.supplements.splice(Number(a.closest('[data-supp]').dataset.supp), 1)
          return renderPanel()
      }
    })

    // champs : réglages de catégorie, suppléments, disponibilité
    el.addEventListener('input', (e) => {
      const t = e.target
      if (t.dataset.cat && t.type !== 'checkbox' && t.tagName === 'INPUT') {
        cat()[t.dataset.cat] = t.value
        if (t.dataset.cat === 'name') {
          $('[data-cat-title]', el).textContent = t.value || 'Sans nom'
          $(`[data-cat-i="${state.cat}"] span`, el).textContent = t.value || 'Sans nom'
        }
        paintSavebar()
      } else if (t.dataset.s) {
        const s = state.doc.supplements[Number(t.closest('[data-supp]').dataset.supp)]
        s[t.dataset.s] = t.dataset.s === 'price' ? Number(t.value) : t.value
        paintSavebar()
      }
    })
    el.addEventListener('change', (e) => {
      const t = e.target
      if (t.dataset.cat && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
        cat()[t.dataset.cat] = t.type === 'checkbox' ? t.checked : t.value
        renderPanel()
      } else if (t.dataset.act === 'avail') {
        const it = cat().items[Number(t.closest('[data-item]').dataset.item)]
        if (t.checked) delete it.available
        else it.available = false
        renderPanel()
      }
    })

    async function save(force = false) {
      try {
        const res = await call('/admin/menu', { method: 'PUT', body: { menu: state.doc, baseUpdatedAt: state.updatedAt, force } })
        state.doc = res.menu
        state.base = JSON.stringify(res.menu)
        state.updatedAt = res.updatedAt
        renderPanel()
        toast('Le site affiche la nouvelle carte d’ici une minute.', { title: 'Carte enregistrée' })
      } catch (err) {
        if (err.status === 409) {
          const ok = await confirmDialog({
            title: 'La carte a changé ailleurs',
            text: 'Elle a été modifiée depuis un autre appareil. Enregistrer quand même remplace ces changements par les tiens.',
            confirm: 'Enregistrer quand même',
            cancel: 'Ne rien faire',
          })
          if (ok) return save(true)
          return
        }
        toast(err.message, { type: 'error', title: 'Carte non enregistrée', duration: 7000 })
      }
    }

    // --- éditeur de produit ------------------------------------------------------------------------------
    function editItem(index) {
      const c = cat()
      const isNew = index < 0
      const d = isNew ? { id: '', name: '', price: 0 } : clone(c.items[index])
      const groups = [...new Set(c.items.map((x) => x.group).filter(Boolean))]
      const pickCats = state.doc.categories.filter((x) => x.id)

      const body = `<form class="stack" data-form novalidate>
  <div class="photo">
    <div class="photo__drop" data-drop tabindex="0" role="button" aria-label="Choisir une photo"></div>
    <div><p class="label">Photo du plat</p><p class="hint">JPEG, PNG ou WebP, jusqu'à 3 Mo. Elle est allégée automatiquement.</p><div class="photo__actions" data-photo-actions></div>
      <input type="file" accept="image/jpeg,image/png,image/webp" data-file hidden></div>
  </div>
  <div class="field"><label for="f-name">Nom du produit</label><input class="input" id="f-name" data-f="name" maxlength="60" value="${esc(d.name)}" placeholder="Ex : Margherita" required></div>
  <div class="field"><label for="f-group">Groupe <span class="hint">(facultatif)</span></label><input class="input" id="f-group" data-f="group" maxlength="40" list="f-groups" value="${esc(d.group ?? '')}" placeholder="Ex : Sauce blanche"><datalist id="f-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist></div>
  <div class="field"><label for="f-desc">Description <span class="hint">(facultatif)</span></label><textarea class="textarea" id="f-desc" data-f="desc" maxlength="220" rows="3" placeholder="Ingrédients, sauce…">${esc(d.desc ?? '')}</textarea></div>
  <fieldset class="fieldset">
    <div class="fieldset__head"><span class="fieldset__title">Prix</span>
      <div class="seg" role="group" aria-label="Type de prix"><button type="button" data-pm="single" aria-pressed="${!d.sizes?.length}">Prix unique</button><button type="button" data-pm="sizes" aria-pressed="${Boolean(d.sizes?.length)}">Plusieurs tailles</button></div></div>
    <div data-price></div>
  </fieldset>
  <fieldset class="fieldset">
    <div class="fieldset__head"><span class="fieldset__title">Choix obligatoire</span><label class="switch"><input type="checkbox" data-t="choice"${d.choice ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">Activer le choix obligatoire</span></label></div>
    <p class="hint">Le client doit choisir une option. Ex : la viande (Poulet ou Viande hachée).</p>
    <div data-choice></div>
  </fieldset>
  <fieldset class="fieldset">
    <div class="fieldset__head"><span class="fieldset__title">Parfums au choix</span><label class="switch"><input type="checkbox" data-t="pick"${d.pick ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">Activer les parfums au choix</span></label></div>
    <p class="hint">Le client choisit plusieurs produits d'une catégorie. Ex : Pizza Méga, jusqu'à 4 parfums.</p>
    <div data-pick></div>
  </fieldset>
  <fieldset class="fieldset"><span class="fieldset__title">Badges</span><div class="chips">${Object.entries(TAG_LABEL)
    .map(([k, l]) => `<button class="chip" type="button" data-tag="${k}" aria-pressed="${(d.tags ?? []).includes(k)}">${icon(TAG_ICON[k])}${l}</button>`)
    .join('')}</div></fieldset>
  <div style="display:flex;flex-wrap:wrap;gap:16px 28px">
    <label class="switch"><input type="checkbox" data-f="available"${d.available !== false ? ' checked' : ''}><span class="switch__track"></span>Disponible (sinon « Épuisé »)</label>
    <label class="switch"><input type="checkbox" data-f="hidden"${d.hidden ? ' checked' : ''}><span class="switch__track"></span>Masqué du site</label>
  </div>
  <p class="form-error" data-err hidden></p>
</form>`
      const foot = `${isNew ? '' : `<button class="btn btn--danger" type="button" data-x="delete">${icon('trash')}Supprimer</button>`}<span class="spacer"></span><button class="btn btn--ghost" type="button" data-x="cancel">Annuler</button><button class="btn btn--primary" type="button" data-x="ok">${icon('check')}Valider</button>`
      const dr = drawer({ title: isNew ? 'Nouveau produit' : d.name, label: isNew ? 'Nouveau produit' : `Modifier ${d.name}`, body, foot })
      const root = dr.el
      const form = $('[data-form]', root)

      // photo
      const paintPhoto = (busyNow = false) => {
        $('[data-drop]', root).innerHTML = `${d.image ? `<img src="${esc(d.image)}" alt="">` : `<span>${icon('image')}Ajouter une photo</span>`}${busyNow ? '<span class="photo__busy"></span>' : ''}`
        $('[data-photo-actions]', root).innerHTML = `<button class="btn btn--ghost btn--sm" type="button" data-x="pick">${icon('upload-simple')}${d.image ? 'Changer' : 'Choisir une photo'}</button>${
          d.image ? `<button class="btn btn--danger btn--sm" type="button" data-x="unphoto">${icon('trash')}Retirer</button>` : ''
        }`
      }
      paintPhoto()
      async function upload(file) {
        if (!file) return
        if (!/^image\//.test(file.type)) return toast('Choisis une image (JPEG, PNG ou WebP).', { type: 'error' })
        paintPhoto(true)
        try {
          const blob = await compress(file)
          const { url } = await call('/admin/photo', { method: 'POST', blob, timeout: 60000 })
          d.image = url
        } catch (err) {
          toast(err.message, { type: 'error', title: 'Photo non envoyée' })
        }
        paintPhoto()
      }
      const fileInput = $('[data-file]', root)
      fileInput.addEventListener('change', () => upload(fileInput.files[0]).then(() => (fileInput.value = '')))
      const drop = $('[data-drop]', root)
      drop.addEventListener('click', () => fileInput.click())
      drop.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileInput.click()))
      drop.addEventListener('dragover', (e) => {
        e.preventDefault()
        drop.classList.add('is-over')
      })
      drop.addEventListener('dragleave', () => drop.classList.remove('is-over'))
      drop.addEventListener('drop', (e) => {
        e.preventDefault()
        drop.classList.remove('is-over')
        upload(e.dataTransfer.files[0])
      })

      // prix
      const paintPrice = () => {
        const box = $('[data-price]', root)
        if (d.sizes?.length) {
          box.innerHTML = `<div class="sizes">${d.sizes
            .map(
              (s, i) => `<div class="sizes__row" data-size="${i}"><input class="input input--sm" data-sz="label" value="${esc(s.label)}" maxlength="12" placeholder="Taille (ex : M)" aria-label="Nom de la taille">
  <label class="input-icon"><input class="input input--sm num" data-sz="price" type="number" min="0" step="10" inputmode="numeric" value="${s.price}" style="padding-left:12px;padding-right:36px" aria-label="Prix de la taille"><span style="position:absolute;right:12px;top:50%;translate:0 -50%;color:var(--text-3);font-size:13px">DA</span></label>
  <button class="icon-btn icon-btn--danger" type="button" data-x="size-del" aria-label="Retirer cette taille"${d.sizes.length < 2 ? ' disabled' : ''}>${icon('trash')}</button></div>`,
            )
            .join('')}</div>${d.sizes.length < 6 ? `<button class="btn btn--ghost btn--sm" type="button" data-x="size-add" style="justify-self:start">${icon('plus')}Ajouter une taille</button>` : ''}`
        } else {
          box.innerHTML = `<label class="input-icon" style="max-width:220px"><span class="sr-only">Prix en dinars</span><input class="input num" data-f="price" type="number" min="0" step="10" inputmode="numeric" value="${d.price ?? 0}" style="padding-left:14px;padding-right:40px"><span style="position:absolute;right:14px;top:50%;translate:0 -50%;color:var(--text-3)">DA</span></label>`
        }
      }
      paintPrice()

      // choix et parfums
      const paintChoice = () => {
        const box = $('[data-choice]', root)
        if (!d.choice) return (box.innerHTML = '')
        box.innerHTML = `<div class="field"><label for="f-cl">Question posée</label><input class="input input--sm" id="f-cl" data-ch="label" value="${esc(d.choice.label)}" maxlength="30" placeholder="Ex : Viande"></div>
<div class="field"><span class="label">Options (2 minimum)</span><div class="opts">${d.choice.options
          .map((o, i) => `<span class="opt">${esc(o)}<button type="button" data-x="opt-del" data-i="${i}" aria-label="Retirer ${esc(o)}">${icon('x')}</button></span>`)
          .join('')}</div>
<div style="display:flex;gap:8px"><input class="input input--sm" data-new-opt maxlength="40" placeholder="Nouvelle option"><button class="btn btn--ghost btn--sm" type="button" data-x="opt-add" style="height:40px">${icon('plus')}Ajouter</button></div></div>`
      }
      const paintPick = () => {
        const box = $('[data-pick]', root)
        if (!d.pick) return (box.innerHTML = '')
        box.innerHTML = `<div class="row">
  <div class="field"><label for="f-pl">Libellé</label><input class="input input--sm" id="f-pl" data-pk="label" value="${esc(d.pick.label)}" maxlength="40"></div>
  <div class="field"><label for="f-pc">Nombre maximum</label><input class="input input--sm num" id="f-pc" data-pk="count" type="number" min="1" max="8" value="${d.pick.count}"></div>
  <div class="field"><label for="f-pf">Parmi la catégorie</label><select class="select input--sm" id="f-pf" data-pk="from" style="height:40px">${pickCats
    .map((x) => `<option value="${esc(x.id)}"${x.id === d.pick.from ? ' selected' : ''}>${esc(x.name)}</option>`)
    .join('')}</select></div>
</div>`
      }
      paintChoice()
      paintPick()

      const err = $('[data-err]', root)
      form.addEventListener('input', (e) => {
        const t = e.target
        err.hidden = true
        if (t.dataset.f && t.type !== 'checkbox') d[t.dataset.f] = t.dataset.f === 'price' ? Number(t.value) : t.value
        if (t.dataset.sz) {
          const s = d.sizes[Number(t.closest('[data-size]').dataset.size)]
          s[t.dataset.sz] = t.dataset.sz === 'price' ? Number(t.value) : t.value
        }
        if (t.dataset.ch) d.choice[t.dataset.ch] = t.value
        if (t.dataset.pk) d.pick[t.dataset.pk] = t.dataset.pk === 'count' ? Number(t.value) : t.value
      })
      form.addEventListener('change', (e) => {
        const t = e.target
        if (t.dataset.f === 'available') {
          if (t.checked) delete d.available
          else d.available = false
        } else if (t.dataset.f === 'hidden') {
          if (t.checked) d.hidden = true
          else delete d.hidden
        } else if (t.dataset.t === 'choice') {
          if (t.checked) d.choice = { label: 'Viande', options: [] }
          else delete d.choice
          paintChoice()
        } else if (t.dataset.t === 'pick') {
          if (t.checked) d.pick = { label: 'Tes parfums', count: 4, from: pickCats[0]?.id ?? '' }
          else delete d.pick
          paintPick()
        } else if (t.dataset.pk === 'from') d.pick.from = t.value
      })
      form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-new-opt]')) {
          e.preventDefault()
          $('[data-x="opt-add"]', root).click()
        }
      })

      root.addEventListener('click', async (e) => {
        const tag = e.target.closest('[data-tag]')
        if (tag) {
          const on = tag.getAttribute('aria-pressed') !== 'true'
          tag.setAttribute('aria-pressed', String(on))
          const tags = new Set(d.tags ?? [])
          on ? tags.add(tag.dataset.tag) : tags.delete(tag.dataset.tag)
          d.tags = [...tags]
          if (!d.tags.length) delete d.tags
          return
        }
        const pm = e.target.closest('[data-pm]')
        if (pm) {
          $$('[data-pm]', root).forEach((b) => b.setAttribute('aria-pressed', String(b === pm)))
          if (pm.dataset.pm === 'sizes' && !d.sizes?.length) {
            d.sizes = [
              { label: 'M', price: d.price ?? 0 },
              { label: 'L', price: d.price ?? 0 },
            ]
            delete d.price
          } else if (pm.dataset.pm === 'single' && d.sizes?.length) {
            d.price = d.sizes[0].price
            delete d.sizes
          }
          return paintPrice()
        }
        const x = e.target.closest('[data-x]')?.dataset.x
        if (!x) return
        if (x === 'pick') return fileInput.click()
        if (x === 'unphoto') {
          delete d.image
          return paintPhoto()
        }
        if (x === 'size-add') {
          d.sizes.push({ label: '', price: d.sizes.at(-1)?.price ?? 0 })
          paintPrice()
          return $$('[data-sz="label"]', root).at(-1)?.focus()
        }
        if (x === 'size-del') {
          d.sizes.splice(Number(e.target.closest('[data-size]').dataset.size), 1)
          return paintPrice()
        }
        if (x === 'opt-add') {
          const input = $('[data-new-opt]', root)
          const v = input.value.trim()
          if (v && !d.choice.options.includes(v) && d.choice.options.length < 10) d.choice.options.push(v)
          paintChoice()
          return $('[data-new-opt]', root)?.focus()
        }
        if (x === 'opt-del') {
          d.choice.options.splice(Number(e.target.closest('[data-i]').dataset.i), 1)
          return paintChoice()
        }
        if (x === 'cancel') return dr.close()
        if (x === 'delete') {
          if (!(await confirmDialog({ title: `Supprimer « ${c.items[index].name} » ?`, text: 'Pour le retirer seulement quelques jours, marque-le plutôt « Épuisé » ou « Masqué ».', confirm: 'Supprimer', danger: true })))
            return
          c.items.splice(index, 1)
          dr.close()
          return renderPanel()
        }
        if (x === 'ok') {
          const problem = check(d)
          if (problem) {
            err.textContent = problem
            err.hidden = false
            err.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
          }
          const clean = tidy(d)
          if (isNew) c.items.push(clean)
          else c.items[index] = clean
          dr.close()
          renderPanel()
          toast('N’oublie pas d’enregistrer la carte.', { type: 'info', title: isNew ? 'Produit ajouté' : 'Produit modifié', duration: 3000 })
        }
      })
      if (isNew) setTimeout(() => $('#f-name', root)?.focus(), 80)
    }

    /** Vérifications avant de valider un produit (le serveur revérifie tout à l'enregistrement). */
    function check(d) {
      if (!String(d.name ?? '').trim()) return 'Donne un nom au produit.'
      const okPrice = (v) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 200000
      if (d.sizes?.length) {
        if (d.sizes.some((s) => !String(s.label).trim())) return 'Donne un nom à chaque taille.'
        if (new Set(d.sizes.map((s) => s.label.trim())).size !== d.sizes.length) return 'Deux tailles portent le même nom.'
        if (d.sizes.some((s) => !okPrice(s.price))) return 'Chaque taille doit avoir un prix en dinars (nombre entier).'
      } else if (!okPrice(d.price)) return 'Indique un prix en dinars (nombre entier).'
      if (d.choice && d.choice.options.length < 2) return 'Le choix obligatoire demande au moins 2 options (ou désactive-le).'
      if (d.pick && (!d.pick.from || !(d.pick.count >= 1 && d.pick.count <= 8))) return 'Parfums au choix : choisis une catégorie et un nombre entre 1 et 8.'
      return null
    }
    function tidy(d) {
      const out = clone(d)
      for (const k of ['group', 'desc']) {
        out[k] = String(out[k] ?? '').trim()
        if (!out[k]) delete out[k]
      }
      out.name = out.name.trim()
      if (out.sizes) out.sizes = out.sizes.map((s) => ({ label: s.label.trim(), price: Number(s.price) }))
      if (out.price !== undefined) out.price = Number(out.price)
      return out
    }

    load()
    return {
      isDirty: dirty,
      async canLeave() {
        if (!dirty()) return true
        return confirmDialog({ title: 'Quitter sans enregistrer ?', text: 'Tes modifications de la carte seront perdues.', confirm: 'Quitter', cancel: 'Rester', danger: true })
      },
    }
  },
}
