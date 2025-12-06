import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

/**
 * 📝 ÉCRAN D'INSCRIPTION
 *
 * Permet à l'utilisateur de créer un compte avec :
 * - Email
 * - Mot de passe (min 8 caractères)
 * - Nom (optionnel)
 *
 * ✨ Si l'utilisateur avait des sessions anonymes, elles seront
 *    automatiquement migrées vers son nouveau compte
 */
export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { signup } = useAuth();
  const navigation = useNavigation();

  const handleSignup = async () => {
    // Validation
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erreur', 'Email invalide');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Erreur', 'Veuillez accepter la politique de confidentialité et les conditions d\'utilisation');
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, name || undefined);
      Alert.alert(
        'Succès',
        'Compte créé avec succès ! Vos sessions précédentes ont été migrées.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack() // Retour à l'écran profil
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur d\'inscription',
        error.message || 'Une erreur est survenue'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Inscription</Text>
            <Text style={styles.subtitle}>
              Créez votre compte pour sécuriser vos données
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mot de passe * (min. 8 caractères)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  activeOpacity={1}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  activeOpacity={1}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Info migration */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✨ Vos sessions précédentes seront automatiquement liées à votre nouveau compte
              </Text>
            </View>

            {/* Checkbox consentement RGPD */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              disabled={isLoading}
              activeOpacity={1}
            >
              <View style={styles.checkbox}>
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={18} color="#4CAF50" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                J'accepte la{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://sentiers-974.onrender.com/privacy-policy')}
                >
                  politique de confidentialité
                </Text>
                {' '}et les{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://sentiers-974.onrender.com/terms-of-service')}
                >
                  conditions d'utilisation
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Bouton inscription */}
            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={1}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            {/* Lien vers connexion */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Déjà un compte ? </Text>
              <TouchableOpacity onPress={goToLogin} disabled={isLoading}>
                <Text style={styles.loginLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24
  },
  header: {
    marginBottom: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  inputContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center'
  },
  signupButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  signupButtonDisabled: {
    backgroundColor: '#9E9E9E'
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  loginText: {
    fontSize: 14,
    color: '#666'
  },
  loginLink: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20
  },
  link: {
    color: '#2196F3',
    textDecorationLine: 'underline'
  }
});
