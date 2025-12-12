// src/components/TabBarIcon.tsx  
import React from 'react';  
import Ionicons from 'react-native-vector-icons/Ionicons'; // Changed to default import  
import { StyleSheet } from 'react-native';
  
interface TabBarIconProps {  
  name: string;  
  focused: boolean;  
  color: string;  
  size: number;  
}  
  
export const TabBarIcon: React.FC<TabBarIconProps> = ({  
  name,  
  focused,  
  color,  
  size,  
}) => {  
  const getIconName = (iconName: string): string => {  
    switch (iconName) {  
      case 'home':  
        return focused ? 'home' : 'home-outline';  
      case 'person':  
        return focused ? 'person' : 'person-outline';  
      case 'chatbubbles':  
        return focused ? 'chatbubbles' : 'chatbubbles-outline';  
      default:  
        return 'help-outline';  
    }  
  };  
  
  return (  
    <Ionicons  
      name={getIconName(name)}  
      size={size}  
      color={color}  
      style={styles.icon}  
    />  
  );  
};  
  
const styles = StyleSheet.create({  
  icon: {  
    marginBottom: -3,  
  },  
});