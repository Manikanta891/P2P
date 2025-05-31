import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { globalStyles } from '../styles/globalStyles';

const DatePickerInput = ({ 
  label, 
  date, 
  onDateChange, 
  placeholder = "Select Date",
  minimumDate = null,
  maximumDate = null 
}) => {
  const [show, setShow] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return placeholder;
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const onChange = (event, selectedDate) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate && event.type !== 'dismissed') {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onDateChange(formattedDate);
    }
  };

  const showDatepicker = () => {
    setShow(true);
  };

  return (
    <View style={{ marginVertical: 8 }}>
      {label && (
        <Text style={[globalStyles.text, { marginBottom: 4, fontWeight: '600' }]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          globalStyles.input,
          { 
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            borderColor: '#dee2e6'
          }
        ]}
        onPress={showDatepicker}
      >
        <Text style={[
          globalStyles.text,
          { color: date ? '#333' : '#999' }
        ]}>
          {formatDate(date)}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date ? new Date(date) : new Date()}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
};

export default DatePickerInput;
