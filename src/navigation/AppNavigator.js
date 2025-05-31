import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import LenderScreen from '../screens/LenderScreen';
import BorrowerScreen from '../screens/BorrowerScreen';
import CalculatorScreen from '../screens/CalculatorScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const LenderStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="LenderMain" component={LenderScreen} options={{ title: 'Lenders' }} />
    <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: 'Transaction History' }} />
  </Stack.Navigator>
);

const BorrowerStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="BorrowerMain" component={BorrowerScreen} options={{ title: 'Borrowers' }} />
    <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: 'Loan History' }} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Lenders') {
              iconName = 'account-balance-wallet';
            } else if (route.name === 'Borrowers') {
              iconName = 'person';
            } else if (route.name === 'Calculator') {
              iconName = 'calculate';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Lenders" component={LenderStack} />
        <Tab.Screen name="Borrowers" component={BorrowerStack} />
        <Tab.Screen name="Calculator" component={CalculatorScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
