import argparse
import json
import re
from html import escape
from pathlib import Path
from string import Template
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
CATEGORIES = {
    "software": "Logiciel",
    "extension": "Extension navigateur",
    "utility": "Utilitaire",
    "game": "Jeu",
    "app": "Application",
    "other": "Autre",
}
CATEGORY_HEADINGS = {
    "software": "Logiciels",
    "extension": "Extensions",
    "utility": "Utilitaires",
    "game": "Jeux",
    "app": "Applications",
    "other": "Autres projets",
}
FIELDS = {
    "id", "name", "category", "publisher", "summary", "description", "icon",
    "color", "status", "pricing", "pricingDetails", "features", "downloads",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def is_text(value):
    return isinstance(value, str) and bool(value.strip())


def validate(project, slug):
    require(isinstance(project, dict) and project.keys() == FIELDS,
            "champs manquants ou inconnus")
    for field in FIELDS - {"features", "downloads", "pricingDetails"}:
        require(is_text(project[field]), f"{field} doit contenir du texte")
    require(isinstance(project["pricingDetails"], str), "pricingDetails doit être du texte")
    require(project["id"] == slug and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug),
            "id invalide ou différent du nom du fichier")
    require(project["category"] in CATEGORIES, "catégorie inconnue")
    require(re.fullmatch(r"#[a-fA-F0-9]{6}", project["color"]), "color doit être un code hexadécimal")
    require(project["status"] in {"upcoming", "available"}, "statut inconnu")
    icon = project["icon"]
    require(re.fullmatch(r"assets/projects/[a-z0-9][a-z0-9_-]*\.(png|webp|jpe?g)", icon)
            and (ROOT / icon).is_file(), "icône introuvable ou chemin invalide")
    for collection, keys in [("features", {"title", "text"}), ("downloads", {"label", "url"})]:
        entries = project[collection]
        require(isinstance(entries, list), f"{collection} doit être une liste")
        for entry in entries:
            require(isinstance(entry, dict) and entry.keys() == keys
                    and all(is_text(value) for value in entry.values()), f"entrée invalide dans {collection}")
    require(bool(project["downloads"]) == (project["status"] == "available"),
            "une publication disponible doit avoir au moins un lien, une publication en préparation aucun")
    for link in project["downloads"]:
        url = urlsplit(link["url"])
        require(re.fullmatch(r"https://[^\s\\]+", link["url"]) and url.hostname
                and url.username is None and url.password is None, "lien de téléchargement HTTPS invalide")


def render_card(project):
    p = {key: escape(value) for key, value in project.items() if isinstance(value, str)}
    category = CATEGORIES[p["category"]]
    badge = "En préparation" if p["status"] == "upcoming" else p["pricing"]
    return f'''          <a class="catalog-card" href="products/{p["id"]}.html" style="--project-color: {p["color"]}">
            <div class="card-art"><img src="{p["icon"]}" width="112" height="112" alt=""></div>
            <div class="card-copy">
              <div class="card-title"><h4>{p["name"]}</h4><span aria-hidden="true">↗</span></div>
              <p>{category}</p>
              <span class="card-badge">{badge}</span>
            </div>
          </a>'''


def render_catalog(template, projects):
    by_name = sorted(projects, key=lambda project: project["name"].casefold())
    groups = []
    filters = ['<button type="button" data-filter="all" aria-pressed="true">Tous</button>']
    for category, title in CATEGORY_HEADINGS.items():
        cards = [render_card(project) for project in by_name if project["category"] == category]
        if not cards:
            continue
        card_markup = "\n".join(cards)
        groups.append(f'''      <section class="catalog-group" data-category="{category}" aria-labelledby="category-{category}">
        <h3 id="category-{category}">{title}</h3>
        <div class="project-grid">
{card_markup}
        </div>
      </section>''')
        filters.append(f'<button type="button" data-filter="{category}" aria-pressed="false">{title}</button>')

    filter_markup = ""
    if len(groups) > 1:
        filter_markup = (
            '      <div class="catalog-filters" role="group" aria-label="Filtrer par catégorie" hidden>\n        '
            + '\n        '.join(filters) + '\n      </div>'
        )
    return template.substitute(filters=filter_markup, groups="\n".join(groups))


def render_product(template, project):
    p = {key: escape(value) for key, value in project.items() if isinstance(value, str)}
    p["category"] = CATEGORIES[p["category"]]
    if project["downloads"]:
        links = [
            f'<a class="download-button" href="{escape(link["url"])}">{escape(link["label"])} <span aria-hidden="true">↗</span></a>'
            for link in project["downloads"]
        ]
        p["downloads"] = '      <div class="download-actions">' + "".join(links) + '</div>'
    else:
        p["downloads"] = '      <p class="coming-soon">Publication en préparation</p>'

    articles = [
        f'<article><h2>{escape(feature["title"])}</h2><p>{escape(feature["text"])}</p></article>'
        for feature in project["features"]
    ]
    p["features"] = (
        '    <section class="feature-grid" aria-label="Fonctionnalités">\n      '
        + '\n      '.join(articles) + '\n    </section>'
    ) if articles else ""
    p["pricing"] = (
        '    <section class="product-details"><div><h2>Tarification</h2>'
        f'<p>{p["pricingDetails"]}</p></div></section>'
    ) if p["pricingDetails"] else ""
    return template.substitute(p)


def main():
    parser = argparse.ArgumentParser(description="Génère le catalogue statique Xtrunn.")
    parser.add_argument("--check", action="store_true", help="vérifie sans modifier les fichiers")
    args = parser.parse_args()
    projects = []
    for path in sorted((ROOT / "catalog").glob("*.json")):
        try:
            project = json.loads(path.read_text(encoding="utf-8-sig"))
            validate(project, path.stem)
        except ValueError as exc:
            parser.error(f"{path.name} : {exc}")
        projects.append(project)
    require(projects, "Ajoutez au moins une fiche dans catalog/.")

    home = Template((ROOT / "templates/catalog.html").read_text(encoding="utf-8"))
    detail = Template((ROOT / "templates/product.html").read_text(encoding="utf-8"))
    pages = {ROOT / "index.html": render_catalog(home, projects)}
    for project in projects:
        pages[ROOT / "products" / f'{project["id"]}.html'] = render_product(detail, project)

    for path, body in pages.items():
        output = "<!-- Généré par build_catalog.py. Modifier le catalogue ou les modèles. -->\n" + body
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != output:
                parser.error(f"{path.relative_to(ROOT)} est à régénérer avec python build_catalog.py")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(output, encoding="utf-8")
    print(f"{len(projects)} projet(s), {len(pages)} page(s).")


if __name__ == "__main__":
    main()
