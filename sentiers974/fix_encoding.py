#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import codecs

# Lire le fichier en détectant l'encodage
input_file = "src/hooks/usePointsOfInterest.ts"

try:
    # Essayer d'abord UTF-8 avec BOM
    with codecs.open(input_file, 'r', encoding='utf-8-sig') as f:
        content = f.read()
except:
    # Fallback UTF-8 sans BOM
    with codecs.open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

# Replacements pour corriger l'encodage corrompu
replacements = [
    (r'ðŸ"¤ DonnÃ©es envoyÃ©es', '📤 Données envoyées'),
    (r'ðŸ"— URL de l.endpoint', '🔗 URL de l\'endpoint'),
    (r'ðŸ"‹ DonnÃ©es de rÃ©ponse', '📋 Données de réponse'),
    (r'â˜ï¸', '☁️'),
    (r'âš ï¸', '⚠️'),
    (r'âŒ', '❌'),
    (r'âœ…', '✅'),
    (r'ðŸ"·', '📷'),
    (r'ðŸ"¥', '🔥'),
    (r'ðŸ"±', '📱'),
    (r'ðŸ"', '🔍'),
    (r'ðŸ'¾', '💾'),
    (r'ðŸ"', '📍'),
    (r'ðŸ—'ï¸', '🗑️'),
    (r'ðŸ—‚ï¸', '🗂️'),
    # Corriger les encodages de texte corrompus
    (r'dÃ©faut', 'défaut'),
    (r'crÃ©Ã©', 'créé'),
    (r'supprimÃ©', 'supprimé'),
    (r'chargÃ©s', 'chargés'),
    (r'chargÃ©', 'chargé'),
    (r'sauvegardÃ©s', 'sauvegardés'),
    (r'Ã©chec', 'échec'),
    (r'rÃ©ponse', 'réponse'),
    (r'RÃ©ponse', 'Réponse'),
    (r'ajoutÃ©e', 'ajoutée'),
    (r'expirÃ©e', 'expirée'),
    (r'Ã©tat', 'état'),
    (r'rÃ©seau', 'réseau'),
]

# Appliquer tous les remplacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Réécrire le fichier proprement en UTF-8 sans BOM
with codecs.open(input_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Encodage corrigé avec succès")