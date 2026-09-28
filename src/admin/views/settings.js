import { call, session } from '../api.js'
import { $, $$, esc, icon, toast, busy, confirmDialog, soundOn, setSound, chime, unlockAudio } from '../ui.js'

/** Force approximative d'un mot de passe (0 à 4). */
function strength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 10) score++
  if (pw.length >= 14) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return Math.max(1, Math.min(4, score))
}
const LEVEL = ['', 'Trop faible', 'Moyen', 'Bon', 'Excellent']

const pwField = (id, label, auto) => `<div class="field"><label for="${id}">${label}</label>
  <div class="input-icon">${icon('lock-key')}<input class="input" id="${id}" name="${id}" type="password" autocomplete="${auto}" required>
  <button class="reveal" type="button" data-reveal aria-label="Afficher">${icon('eye')}</button></div></div>`

export default {
  mount(el) {
    const notif = 'Notification' in window
    el.innerHTML = `<header class="head">
  <div><p class="head__kicker">Connecté en tant que <strong data-me></strong></p><h1 class="head__title">Para<em>mètres</em></h1></div>
</header>
<div class="settings">
  <form class="card stack" data-user novalidate>
    <div><h2 class="card__title">Identifiant</h2><p class="card__sub">Le nom utilisé pour te connecter.</p></div>
    <div class="field"><label for="u-name">Nouvel identifiant</label><div class="input-icon">${icon('user')}<input class="input" id="u-name" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required></div>
      <p class="hint">3 à 32 caractères : lettres minuscules, chiffres, point, tiret.</p></div>
    ${pwField('u-pass', 'Mot de passe actuel', 'current-password')}
    <p class="form-error" data-err hidden></p>
    <button class="btn btn--primary" type="submit" style="justify-self:start">${icon('floppy-disk')}Changer l'identifiant</button>
  </form>

  <form class="card stack" data-pass novalidate>
    <div><h2 class="card__title">Mot de passe</h2><p class="card__sub">Les autres appareils connectés seront déconnectés.</p></div>
    ${pwField('p-old', 'Mot de passe actuel', 'current-password')}
    ${pwField('p-new', 'Nouveau mot de passe', 'new-password')}
    <div><div class="strength" data-strength data-level="0"><span></span><span></span><span></span><span></span></div><p class="hint" data-strength-text>10 caractères minimum. Mélange lettres, chiffres et symboles.</p></div>
    ${pwField('p-new2', 'Confirme le nouveau mot de passe', 'new-password')}
    <p class="form-error" data-err hidden></p>
    <button class="btn btn--primary" type="submit" style="justify-self:start">${icon('shield-check')}Changer le mot de passe</button>
  </form>

  <section class="card stack">
    <div><h2 class="card__title">Alertes de commande</h2><p class="card__sub">Pour ne rater aucune commande pendant le service.</p></div>
    <label class="switch"><input type="checkbox" data-sound-toggle${soundOn() ? ' checked' : ''}><span class="switch__track"></span>Son à chaque nouvelle commande</label>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      <button class="btn btn--ghost btn--sm" type="button" data-test-sound>${icon('speaker-high')}Tester le son</button>
      ${notif ? `<button class="btn btn--ghost btn--sm" type="button" data-notif>${icon('bell-ringing')}<span></span></button>` : ''}
    </div>
    <p class="hint">Garde cette page ouverte sur la caisse ou un téléphone : les commandes arrivent en direct. Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une application.</p>
  </section>

  <section class="card stack">
    <div><h2 class="card__title">Sécurité</h2><p class="card__sub">Un téléphone perdu, un ancien employé ? Coupe tous les accès d'un coup.</p></div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      <button class="btn btn--ghost" type="button" data-logout-here>${icon('sign-out')}Se déconnecter</button>
      <button class="btn btn--danger" type="button" data-logout-all>${icon('shield-check')}Déconnecter tous les appareils</button>
    </div>
    <p class="hint">« Tous les appareils » ferme aussi cette session : tu devras te reconnecter ici.</p>
  </section>
</div>`
    $('[data-me]', el).textContent = session.username
    $('#u-name', el).value = session.username

    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-reveal]')
      if (!r) return
      const input = r.parentElement.querySelector('input')
      const show = input.type === 'password'
      input.type = show ? 'text' : 'password'
      r.innerHTML = icon(show ? 'eye-slash' : 'eye')
      r.setAttribute('aria-label', show ? 'Masquer' : 'Afficher')
    })

    const fail = (form, message) => {
      const box = $('[data-err]', form)
      box.textContent = message
      box.hidden = !message
    }

    // identifiant
    const userForm = $('[data-user]', el)
    userForm.addEventListener('submit', (e) => {
      e.preventDefault()
      fail(userForm, '')
      const username = userForm.elements.username.value.trim().toLowerCase()
      const currentPassword = userForm.elements['u-pass'].value
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) return fail(userForm, "L'identifiant doit faire 3 à 32 caractères : lettres minuscules, chiffres, point ou tiret.")
      if (username === session.username) return fail(userForm, "C'est déjà ton identifiant actuel.")
      if (!currentPassword) return fail(userForm, 'Indique ton mot de passe actuel pour confirmer.')
      busy(userForm.querySelector('[type="submit"]'), async () => {
        try {
          const res = await call('/admin/account', { method: 'POST', body: { username, currentPassword } })
          session.save(res)
          $$('[data-username], [data-me]').forEach((x) => (x.textContent = res.username))
          $$('[data-avatar]').forEach((x) => (x.textContent = res.username.slice(0, 1)))
          userForm.elements['u-pass'].value = ''
          toast(`Ton identifiant est maintenant « ${res.username} ».`, { title: 'Identifiant changé' })
        } catch (err) {
          fail(userForm, err.message)
        }
      })
    })

    // mot de passe
    const passForm = $('[data-pass]', el)
    passForm.elements['p-new'].addEventListener('input', (e) => {
      const lvl = strength(e.target.value)
      $('[data-strength]', el).dataset.level = lvl
      $('[data-strength-text]', el).textContent = e.target.value ? `${LEVEL[lvl]}${e.target.value.length < 10 ? ' : 10 caractères minimum' : ''}` : '10 caractères minimum. Mélange lettres, chiffres et symboles.'
    })
    passForm.addEventListener('submit', (e) => {
      e.preventDefault()
      fail(passForm, '')
      const currentPassword = passForm.elements['p-old'].value
      const newPassword = passForm.elements['p-new'].value
      if (!currentPassword) return fail(passForm, 'Indique ton mot de passe actuel.')
      if (newPassword.length < 10) return fail(passForm, 'Le nouveau mot de passe doit contenir au moins 10 caractères.')
      if (newPassword !== passForm.elements['p-new2'].value) return fail(passForm, 'Les deux nouveaux mots de passe ne sont pas identiques.')
      if (newPassword === currentPassword) return fail(passForm, "Le nouveau mot de passe doit être différent de l'actuel.")
      busy(passForm.querySelector('[type="submit"]'), async () => {
        try {
          const res = await call('/admin/account', { method: 'POST', body: { newPassword, currentPassword } })
          session.save(res)
          passForm.reset()
          $('[data-strength]', el).dataset.level = 0
          toast('Les autres appareils ont été déconnectés.', { title: 'Mot de passe changé' })
        } catch (err) {
          fail(passForm, err.message)
        }
      })
    })

    // alertes
    $('[data-sound-toggle]', el).addEventListener('change', (e) => {
      setSound(e.target.checked)
      $$('[data-sound]').forEach((b) => (b.innerHTML = icon(e.target.checked ? 'speaker-high' : 'speaker-slash')))
    })
    $('[data-test-sound]', el).addEventListener('click', () => {
      unlockAudio()
      if (!soundOn()) return toast('Le son est coupé. Active-le d’abord.', { type: 'info' })
      setTimeout(chime, 60)
    })
    const notifBtn = $('[data-notif]', el)
    const paintNotif = () => {
      if (!notifBtn) return
      const p = Notification.permission
      notifBtn.querySelector('span').textContent =
        p === 'granted' ? 'Notifications activées' : p === 'denied' ? 'Notifications bloquées par le navigateur' : 'Activer les notifications'
      notifBtn.disabled = p !== 'default'
    }
    paintNotif()
    notifBtn?.addEventListener('click', async () => {
      await Notification.requestPermission().catch(() => null)
      paintNotif()
    })

    // sécurité
    $('[data-logout-here]', el).addEventListener('click', () => {
      session.clear()
      location.reload()
    })
    $('[data-logout-all]', el).addEventListener('click', async (e) => {
      const ok = await confirmDialog({
        title: 'Déconnecter tous les appareils ?',
        text: 'Toutes les sessions ouvertes (téléphones, ordinateurs) seront fermées, celle-ci comprise.',
        confirm: 'Tout déconnecter',
        danger: true,
      })
      if (!ok) return
      busy(e.target.closest('button'), async () => {
        try {
          await call('/admin/logout-all', { method: 'POST' })
          session.clear()
          location.reload()
        } catch (err) {
          toast(err.message, { type: 'error' })
        }
      })
    })
    return {}
  },
}

