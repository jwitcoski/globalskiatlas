"""
Rebuild globe_countries rule-based styles for the orthographic inset.

- Default: tan land + light outlines (all other countries)
- Host country only: rose fill + slightly stronger outline (from ski_areas Country)

Run from QGIS: Plugins → Python Console → Show Editor → Open this file → Run Script.

Fixes the bug where an empty-filter child rule matched every polygon and hid the rose highlight.
"""

from qgis.core import QgsProject, QgsFillSymbol, QgsRuleBasedRenderer

proj = QgsProject.instance()

ski = next(L for L in proj.mapLayers().values() if L.name() == "ski_areas")
country_name = (next(ski.getFeatures())["Country"] or "").replace("'", "''")
if not country_name:
    country_name = "United States of America"

globe = next(L for L in proj.mapLayers().values() if L.name() == "globe_countries")

tan_sym = QgsFillSymbol.createSimple(
    {
        "color": "236,228,208,255",
        "outline_color": "205,198,182,255",
        "outline_width": "0.11",
        "outline_width_unit": "MM",
    }
)
rose_sym = QgsFillSymbol.createSimple(
    {
        "color": "218,188,184,255",
        "outline_color": "142,108,104,255",
        "outline_width": "0.22",
        "outline_width_unit": "MM",
    }
)

renderer = QgsRuleBasedRenderer(tan_sym)
root = renderer.rootRule()
rule_hi = QgsRuleBasedRenderer.Rule(rose_sym)
rule_hi.setFilterExpression(
    f"\"ADMIN\" = '{country_name}' OR \"NAME\" = '{country_name}' OR \"SOVEREIGNT\" = '{country_name}' OR \"ADMIN\" ILIKE '{country_name}%'"
)
rule_hi.setDescription("Host country")
root.appendChild(rule_hi)

globe.setRenderer(renderer)
globe.triggerRepaint()
proj.write()

print(f"globe_countries: tan world + rose for host ({country_name})")
