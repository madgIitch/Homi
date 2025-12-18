// src/screens/ProfileDetailScreen.tsx  
import React, { useState, useEffect, useContext } from 'react';  
import {  
  View,  
  Text,  
  ScrollView,  
  StyleSheet,  
  TouchableOpacity,  
  Alert,  
} from 'react-native';  
import { useNavigation } from '@react-navigation/native';  
import { StackNavigationProp } from '@react-navigation/stack';  
import { useTheme } from '../theme/ThemeContext';  
import { Button } from '../components/Button';  
import { Chip } from '../components/Chip';  
import { Image } from 'react-native';  
import { profileService } from '../services/profileService';  
import { AuthContext } from '../context/AuthContext';  
import type { Profile } from '../types/profile';  
  
interface ProfileDetailScreenProps {  
  userId?: string; // Si no se proporciona, muestra el perfil del usuario actual  
}  
  
export const ProfileDetailScreen: React.FC<ProfileDetailScreenProps> = ({  
  userId,  
}) => {  
  const theme = useTheme();  
  const [profile, setProfile] = useState<Profile | null>(null);  
  const [loading, setLoading] = useState(true);  
    
  const navigation = useNavigation<StackNavigationProp<any>>();  
  const authContext = useContext(AuthContext);  
  const currentUserId = authContext?.user?.id ?? '';  
  const isOwnProfile = !userId || userId === currentUserId;  
  
  useEffect(() => {  
    loadProfile();  
  }, [userId]);  
  
  const loadProfile = async () => {  
    try {  
      const data = await profileService.getProfile();  
      setProfile(data);  
    } catch (error) {  
      console.error('Error cargando perfil:', error);  
      Alert.alert('Error', 'No se pudo cargar el perfil');  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  if (loading) {  
    return (  
      <View style={styles.loadingContainer}>  
        <Text>Cargando perfil...</Text>  
      </View>  
    );  
  }  
  
  if (!profile) {  
    return (  
      <View style={styles.loadingContainer}>  
        <Text>No se encontró el perfil</Text>  
      </View>  
    );  
  }  
  
  return (  
    <View style={styles.container}>  
      {/* Header */}  
      <View style={styles.header}>  
        <TouchableOpacity onPress={() => navigation.goBack()}>  
          <Text style={styles.backButton}>←</Text>  
        </TouchableOpacity>  
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>  
          {profile.display_name}  
        </Text>  
        {isOwnProfile && (  
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>  
            <Text style={styles.editButton}>Editar</Text>  
          </TouchableOpacity>  
        )}  
      </View>  
  
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>  
        {/* Hero Section */}  
        <View style={styles.heroSection}>  
          {profile.avatar_url && (  
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />  
          )}  
          <View style={styles.heroInfo}>  
            <Text style={[styles.name, { color: theme.colors.text }]}>  
              {profile.display_name}  
            </Text>  
            <Text style={[styles.location, { color: theme.colors.textSecondary }]}>  
              Sevilla  
            </Text>  
            <View style={styles.housingBadge}>  
              <Text style={styles.housingBadgeText}>  
                {profile.housing_situation === 'seeking' ? 'Busco piso' : 'Tengo piso'}  
              </Text>  
            </View>  
          </View>  
        </View>  
  
        {/* Sobre Section */}  
        {profile.bio && (  
          <View style={styles.section}>  
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>  
              Sobre  
            </Text>  
            <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>  
              {profile.bio}  
            </Text>  
          </View>  
        )}  
  
        {/* Compañeros y Presupuesto */}  
        <View style={styles.rowSection}>  
          <View style={[styles.card, styles.halfCard]}>  
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>  
              Compañeros  
            </Text>  
            <Text style={[styles.cardValue, { color: theme.colors.primary }]}>  
              {profile.num_roommates_wanted || '-'}  
            </Text>  
          </View>  
          <View style={[styles.card, styles.halfCard]}>  
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>  
              Presupuesto  
            </Text>  
            <Text style={[styles.cardValue, { color: theme.colors.primary }]}>  
              {profile.budget_min && profile.budget_max  
                ? `${profile.budget_min}€ - ${profile.budget_max}€`  
                : '-'}  
            </Text>  
          </View>  
        </View>  
  
        {/* Estudios y Trabajo */}  
        <View style={styles.section}>  
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>  
            Estudios y Trabajo  
          </Text>  
          {(profile.university || profile.occupation) && (  
            <View style={styles.studyCards}>  
              {profile.university && (  
                <View style={styles.card}>  
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>  
                    Universidad  
                  </Text>  
                  <Text style={[styles.cardValue, { color: theme.colors.textSecondary }]}>  
                    {profile.university}  
                  </Text>  
                </View>  
              )}  
              {profile.occupation && (  
                <View style={styles.card}>  
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>  
                    Ocupación  
                  </Text>  
                  <Text style={[styles.cardValue, { color: theme.colors.textSecondary }]}>  
                    {profile.occupation}  
                  </Text>  
                </View>  
              )}  
            </View>  
          )}  
        </View>  
  
        {/* Estilo de Vida */}  
        {profile.lifestyle_preferences && (  
          <View style={styles.section}>  
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>  
              Estilo de Vida  
            </Text>  
            <View style={styles.chipsContainer}>  
              {Object.values(profile.lifestyle_preferences).map((pref, index) => (  
                pref && <Chip key={index} label={pref} selected={false} />  
              ))}  
            </View>  
          </View>  
        )}  
  
        {/* Intereses */}  
        {profile.interests && profile.interests.length > 0 && (  
          <View style={styles.section}>  
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>  
              Intereses  
            </Text>  
            <View style={styles.chipsContainer}>  
              {profile.interests.map((interest, index) => (  
                <Chip key={index} label={interest} selected={false} />  
              ))}  
            </View>  
          </View>  
        )}  
  
        {/* Zonas Preferidas */}  
        {profile.preferred_zones && profile.preferred_zones.length > 0 && (  
          <View style={styles.section}>  
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>  
              Zonas de Interés  
            </Text>  
            <View style={styles.chipsContainer}>  
              {profile.preferred_zones.map((zone, index) => (  
                <Chip key={index} label={zone} selected={false} />  
              ))}  
            </View>  
          </View>  
        )}  
  
        {/* Botones de acción para perfiles ajenos */}  
        {!isOwnProfile && (  
          <View style={styles.actionButtons}>  
            <Button  
              title="Enviar mensaje"  
              onPress={() => {  
                // TODO: Implementar lógica de match y chat  
                Alert.alert('Próximamente', 'Función de chat en desarrollo');  
              }}  
            />  
          </View>  
        )}  
      </ScrollView>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: '#FFFFFF',  
  },  
  loadingContainer: {  
    flex: 1,  
    justifyContent: 'center',  
    alignItems: 'center',  
  },  
  header: {  
    flexDirection: 'row',  
    justifyContent: 'space-between',  
    alignItems: 'center',  
    paddingHorizontal: 24,  
    paddingVertical: 16,  
    borderBottomWidth: 1,  
    borderBottomColor: '#E5E7EB',  
  },  
  backButton: {  
    fontSize: 24,  
    fontWeight: 'bold',  
  },  
  headerTitle: {  
    fontSize: 18,  
    fontWeight: '600',  
  },  
  editButton: {  
    fontSize: 16,  
    color: '#6B46C1',  
    fontWeight: '500',  
  },  
  content: {  
    flex: 1,  
    padding: 24,  
  },  
  heroSection: {  
    alignItems: 'center',  
    marginBottom: 32,  
  },  
  avatar: {  
    width: 120,  
    height: 120,  
    borderRadius: 60,  
    marginBottom: 16,  
  },  
  heroInfo: {  
    alignItems: 'center',  
  },  
  name: {  
    fontSize: 24,  
    fontWeight: 'bold',  
    marginBottom: 4,  
  },  
  location: {  
    fontSize: 16,  
    marginBottom: 8,  
  },  
  housingBadge: {  
    backgroundColor: '#6B46C1',  
    paddingHorizontal: 16,  
    paddingVertical: 6,  
    borderRadius: 16,  
  },  
  housingBadgeText: {  
    color: '#FFFFFF',  
    fontSize: 14,  
    fontWeight: '500',  
  },  
  section: {  
    marginBottom: 24,  
  },  
  sectionTitle: {  
    fontSize: 18,  
    fontWeight: '600',  
    marginBottom: 12,  
  },  
  sectionText: {  
    fontSize: 16,  
    lineHeight: 24,  
  },  
  rowSection: {  
    flexDirection: 'row',  
    gap: 16,  
    marginBottom: 24,  
  },  
  card: {  
    backgroundColor: '#F9FAFB',  
    padding: 16,  
    borderRadius: 12,  
    borderWidth: 1,  
    borderColor: '#E5E7EB',  
    flex: 1,  
  },  
  halfCard: {  
    flex: 1,  
  },  
  cardTitle: {  
    fontSize: 14,  
    fontWeight: '500',  
    marginBottom: 4,  
  },  
  cardValue: {  
    fontSize: 16,  
    fontWeight: '600',  
  },  
  studyCards: {  
    gap: 12,  
  },  
  chipsContainer: {  
    flexDirection: 'row',  
    flexWrap: 'wrap',  
    gap: 8,  
  },  
  actionButtons: {  
    marginTop: 32,  
    marginBottom: 24,  
  },  
});