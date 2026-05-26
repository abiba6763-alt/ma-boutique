# FasoMarket — Guide de déploiement
> Architecture statique : GitHub + Netlify + Cloudinary

---

## 🗂️ Structure des fichiers

```
fasomarket/
├── index.html          ← Vitrine publique
├── admin.html          ← Panneau d'administration
├── produits.json       ← "Base de données" (fichier texte)
├── css/
│   └── style.css       ← Design global partagé
└── js/
    ├── app.js          ← Script client (affiche les produits)
    └── admin.js        ← Script admin (gère GitHub + Cloudinary)
```

---

## 🚀 Étapes de déploiement

### 1. Créer le dépôt GitHub

1. Allez sur [github.com/new](https://github.com/new)
2. Nommez le dépôt `fasomarket` (ou ce que vous voulez)
3. Visibilité : **Public** (pour que Netlify puisse le lire)
4. Poussez tous les fichiers de ce projet dans ce dépôt

```bash
git init
git add .
git commit -m "FasoMarket initial"
git remote add origin https://github.com/VOTRE-PSEUDO/fasomarket.git
git push -u origin main
```

---

### 2. Connecter Netlify

1. Créez un compte gratuit sur [netlify.com](https://netlify.com)
2. Cliquez **"Add new site" → "Import an existing project"**
3. Choisissez **GitHub** et sélectionnez votre dépôt `fasomarket`
4. Paramètres de build :
   - **Build command** : *(laisser vide)*
   - **Publish directory** : `.` (ou `/`)
5. Cliquez **"Deploy site"**

Netlify publiera automatiquement le site à chaque modification sur GitHub.

---

### 3. Créer un Personal Access Token GitHub

Ce token permet à votre panneau admin de modifier `produits.json` via l'API GitHub.

1. Sur GitHub : **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Cliquez **"Generate new token (classic)"**
3. Donnez un nom : `fasomarket-admin`
4. Expiration : choisissez selon votre préférence (90 jours, 1 an, ou "No expiration")
5. Cochez **uniquement** la permission : `repo` ✅
6. Cliquez **"Generate token"** et **copiez immédiatement** le token (il ne sera plus affiché)

---

### 4. Configurer Cloudinary

1. Créez un compte gratuit sur [cloudinary.com](https://cloudinary.com) (25 Go offerts)
2. Dans le tableau de bord, notez votre **Cloud Name** (ex: `dpn6u757a`)
3. Allez dans **Settings → Upload → Upload presets**
4. Cliquez **"Add upload preset"**
   - Signing mode : **Unsigned** ⚠️ (obligatoire pour upload depuis le navigateur)
   - Nommez-le : `fasomarket_preset`
5. Sauvegardez

---

### 5. Configurer le panneau admin

1. Ouvrez `votre-site.netlify.app/admin.html`
2. Entrez le code PIN par défaut : **1234**
3. Allez dans l'onglet **🔧 Config** et remplissez :
   - **GitHub Token** : votre PAT généré à l'étape 3
   - **Owner** : votre pseudo GitHub
   - **Repo** : `fasomarket` (nom du dépôt)
   - **Branche** : `main`
   - **Cloud Name** : depuis Cloudinary
   - **Upload Preset** : `fasomarket_preset`
   - **Numéro WhatsApp** : sans + ni espace (ex: `22674059599`)
   - **Numéro OM marchand** : votre numéro Orange Money
4. Cliquez **💾 Sauvegarder la configuration**

> ⚠️ La configuration est stockée dans votre navigateur (localStorage). Elle ne quitte jamais votre appareil, sauf quand vous utilisez le token pour appeler GitHub.

---

## ⚡ Comment ça fonctionne

### Ajouter un produit

1. Admin clique **➕ Ajouter**
2. Remplit le formulaire + uploade l'image sur Cloudinary (Étape A)
3. Clique **✅ Sauvegarder**
4. L'admin.js :
   - Lit `produits.json` sur GitHub (+ récupère le SHA du fichier)
   - Ajoute le nouveau produit dans le tableau JSON
   - Pousse le fichier mis à jour sur GitHub via `PUT /repos/:owner/:repo/contents/:path`
5. GitHub notifie Netlify via un webhook
6. Netlify redéploie le site en **< 30 secondes**
7. Le nouveau produit est visible par tous les visiteurs !

### Côté client (index.html)

- Au chargement, `app.js` fait un simple `fetch('./produits.json')`
- Pour chaque produit, génère une carte HTML
- Les boutons WhatsApp utilisent `encodeURIComponent()` pour encoder le message
- Les boutons USSD Orange Money encodent `#` en `%23` dans les liens `tel:`
- Les images utilisent `loading="lazy"` pour économiser la data mobile

---

## 🔧 Personnalisation rapide

| Ce que vous voulez changer | Où |
|---|---|
| Numéro WhatsApp / OM | Onglet Config dans admin.html |
| Code PIN admin | Onglet Config → Changer le PIN |
| Couleurs du site | `css/style.css` → variables `:root` |
| Texte de la bannière héro | `index.html` → section `.hero` |
| Témoignages | `index.html` → `.testimonials-list` |
| Catégories disponibles | `admin.html` → `<select id="fCategorie">` |

---

## 🔒 Sécurité

- Le **Personal Access Token** n'est stocké **que dans votre navigateur** (localStorage de admin.html)
- Il n'est jamais inclus dans le code source publié sur GitHub
- Le panneau admin est protégé par un code PIN
- L'upload Cloudinary utilise un **preset non-signé** : il ne nécessite pas de clé secrète dans le code

---

## ❓ FAQ

**Q : Puis-je utiliser un dépôt privé GitHub ?**  
R : Oui, Netlify peut se connecter à des dépôts privés, mais vous aurez besoin d'un plan payant Netlify pour les sites privés.

**Q : Que se passe-t-il si je perds mon token GitHub ?**  
R : Révoquez l'ancien token sur GitHub et générez-en un nouveau. Mettez à jour la config dans admin.html.

**Q : Combien d'images puis-je uploader sur Cloudinary gratuitement ?**  
R : Le plan gratuit offre 25 Go de stockage et 25 Go de bande passante/mois, amplement suffisant pour un catalogue de quelques centaines de produits.

**Q : Le site fonctionne-t-il hors connexion ?**  
R : Non dans cette architecture statique pure. Si vous souhaitez le mode hors-ligne, ajoutez un Service Worker (voir l'ancienne version du projet).
