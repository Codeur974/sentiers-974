import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import apiService from '../services/api';

/**
 * ⚙️ ÉCRAN DE PROFIL / PARAMÈTRES
 *
 * Accessible depuis l'icône roue dentée dans le header
 *
 * - Si NON connecté : Affiche boutons "Se connecter" / "S'inscrire"
 * - Si connecté : Affiche infos user + bouton "Se déconnecter"
 */
export default function ProfileScreen() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const navigation = useNavigation();

  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleSignup = () => {
    navigation.navigate('Signup' as never);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Déconnecté', 'Vous avez été déconnecté avec succès');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Supprimer le compte',
      'Cette action est irréversible. Toutes vos données (sessions, photos, etc.) seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Appel à l'API pour suppression complète (RGPD)
              const result = await apiService.deleteAccount();

              if (result.success) {
                // Déconnecter l'utilisateur localement
                await logout();

                Alert.alert(
                  'Compte supprimé',
                  `Votre compte et ${result.data?.deletedSessions || 0} session(s) ont été supprimés définitivement.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Home' as never)
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Erreur',
                  result.message || 'Impossible de supprimer le compte. Veuillez réessayer.'
                );
              }
            } catch (error) {
              console.error('❌ Erreur suppression compte:', error);
              Alert.alert(
                'Erreur',
                'Une erreur est survenue lors de la suppression du compte.'
              );
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon Profil</Text>
          <Text style={styles.subtitle}>
            {isAuthenticated
              ? 'Gérez votre compte et vos paramètres'
              : 'Connectez-vous pour accéder à votre espace personnel'
            }
          </Text>
        </View>

        {/* Si NON connecté */}
        {!isAuthenticated && (
          <View style={styles.notAuthenticatedContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pourquoi créer un compte ?</Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefitItem}>✅ Sauvegarde sécurisée de vos sessions</Text>
                <Text style={styles.benefitItem}>✅ Synchronisation multi-appareils</Text>
                <Text style={styles.benefitItem}>✅ Historique complet de vos activités</Text>
                <Text style={styles.benefitItem}>✅ Statistiques personnalisées</Text>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
                <Text style={styles.primaryButtonText}>S'inscrire</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
                <Text style={styles.secondaryButtonText}>Se connecter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Vos sessions actuelles seront automatiquement liées à votre compte lors de l'inscription
              </Text>
            </View>
          </View>
        )}

        {/* Si connecté */}
        {isAuthenticated && user && (
          <View style={styles.authenticatedContainer}>
            {/* Carte informations utilisateur */}
            <View style={styles.card}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  {user.name && (
                    <Text style={styles.userName}>{user.name}</Text>
                  )}
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userDate}>
                    Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Se déconnecter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
              </TouchableOpacity>
            </View>

            {/* Info RGPD */}
            <View style={styles.rgpdBox}>
              <Text style={styles.rgpdText}>
                🔒 Vos données sont sécurisées et vous pouvez les supprimer à tout moment (RGPD)
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    padding: 20
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666'
  },
  header: {
    marginBottom: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  notAuthenticatedContainer: {
    gap: 16
  },
  authenticatedContainer: {
    gap: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  benefitsList: {
    gap: 12,
    marginBottom: 24
  },
  benefitItem: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 20
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  userDate: {
    fontSize: 12,
    color: '#999'
  },
  actionsContainer: {
    gap: 12
  },
  logoutButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336'
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600'
  },
  rgpdBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16
  },
  rgpdText: {
    fontSize: 13,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20
  }
});