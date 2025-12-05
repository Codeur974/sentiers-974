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
  ScrollView
} from 'react-native';
import { API_URL } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const navigation = useNavigation();

  const handleResetRequest = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erreur', 'Entrez un email valide');
      return;
    }

    setIsLoading(true);
    setDevToken(null);

    try {
      const response = await fetch(`${API_URL}/auth/reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const text = await response.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        throw new Error('Réponse inattendue du serveur');
      }

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Erreur lors de la demande de réinitialisation');
      }

      // En dev, le backend renvoie le token pour faciliter le test
      if (data.resetToken) {
        setDevToken(data.resetToken);
      }

      Alert.alert(
        'Demande envoyée',
        'Si un compte existe pour cet email, un lien de réinitialisation a été généré.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de traiter la demande');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
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

            <TouchableOpacity
              style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
              onPress={handleResetRequest}
              disabled={isLoading}
              activeOpacity={1}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              activeOpacity={1}
            >
              <Text style={styles.backLinkText}>Retour à la connexion</Text>
            </TouchableOpacity>

            {devToken && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenTitle}>Token (dev)</Text>
                <Text style={styles.tokenValue}>{devToken}</Text>
                <Text style={styles.tokenHint}>
                  Utilisez ce token avec /api/auth/reset/confirm pour tester en local.
                </Text>
              </View>
            )}
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
    paddingHorizontal: 24
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
    fontSize: 15,
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
    marginBottom: 20
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
  resetButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  resetButtonDisabled: {
    backgroundColor: '#9E9E9E'
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16
  },
  backLinkText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  tokenBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  tokenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4
  },
  tokenValue: {
    fontSize: 12,
    color: '#BF360C',
    marginBottom: 4
  },
  tokenHint: {
    fontSize: 12,
    color: '#BF360C'
  }
});
