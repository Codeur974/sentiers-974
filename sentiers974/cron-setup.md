# Configuration automatique des mises à jour d'événements

## Mise à jour périodique des événements sportifs

### 1. Configuration manuelle

Pour exécuter manuellement la mise à jour :

```bash
# Depuis le dossier du projet
node update-live-events.js
```

### 2. Configuration automatique (Cron)

#### Linux/Mac - Crontab

Ajouter au crontab (exécution quotidienne à 6h) :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne :
0 6 * * * cd /path/to/sentiers974 && node update-live-events.js >> logs/update.log 2>&1
```

#### Windows - Planificateur de tâches

1. Ouvrir "Planificateur de tâches"
2. Créer une tâche de base
3. Nom: "Mise à jour événements Sentiers 974"
4. Déclencheur: Quotidien à 6h00
5. Action: Démarrer un programme
   - Programme: `node`
   - Arguments: `update-live-events.js`
   - Répertoire: `F:\Sentier-974\sentiers974`

### 3. Configuration GitHub Actions (CI/CD)

Créer `.github/workflows/update-events.yml` :

```yaml
name: Mise à jour événements sportifs

on:
  schedule:
    # Tous les jours à 6h UTC
    - cron: '0 6 * * *'
  workflow_dispatch: # Permet déclenchement manuel

jobs:
  update-events:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Update live events
      env:
        EXPO_PUBLIC_OPENAGENDA_KEY: ${{ secrets.OPENAGENDA_KEY }}
      run: node update-live-events.js
      
    - name: Commit updated cache
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add live-events-cache.json update-log.json
        git diff --staged --quiet || git commit -m "🤖 Mise à jour automatique événements $(date)"
        git push
```

### 4. Configuration Docker (Production)

Créer un conteneur qui s'exécute périodiquement :

```dockerfile
# Dockerfile.updater
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Cron job dans le conteneur
RUN echo "0 6 * * * cd /app && node update-live-events.js" | crontab -

CMD ["crond", "-f"]
```

### 5. Surveillance et monitoring

#### Logs de mise à jour

Les logs sont automatiquement sauvegardés dans :
- `update-log.json` : Historique des mises à jour
- Console : Output en temps réel

#### Métriques importantes

- **Nombre d'événements récupérés**
- **Durée de l'exécution**
- **Sources qui fonctionnent/échouent**
- **Événements à venir dans les 7 jours**

#### Alertes en cas d'échec

Ajouter des notifications :

```javascript
// Dans update-live-events.js, ajouter :
if (!result.success) {
  // Envoyer email/SMS/notification
  await sendAlert(`Échec mise à jour événements: ${result.error}`);
}
```

### 6. Configuration recommandée

**Fréquence optimale :**
- Production : 1x par jour (6h00)
- Développement : Manuel ou 1x par semaine
- Avant événements majeurs : 2x par jour

**Sauvegarde :**
- Garder les 50 derniers logs
- Sauvegarder le cache dans le cloud
- Backup hebdomadaire des données

**Performance :**
- Timeout APIs : 15 secondes max
- Retry automatique en cas d'échec
- Dédoublonnage des événements

### 7. Commandes utiles

```bash
# Test de la configuration
node update-live-events.js

# Voir les logs récents
tail -f logs/update.log

# Nettoyer le cache
rm live-events-cache.json update-log.json

# Vérifier le statut
node -e "console.log(require('./live-events-cache.json'))"
```

Cette configuration garantit des données d'événements toujours à jour sans intervention manuelle.