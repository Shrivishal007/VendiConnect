import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, } from 'react-native';
import { Star, X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { residentService } from '../../services/residentService';
export const RatingModal = ({ visible, vendorId, vendorName, onClose, onSuccess, }) => {
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [submittedSuccess, setSubmittedSuccess] = useState(false);
    const handleSubmit = async () => {
        if (!vendorId)
            return;
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            const res = await residentService.createRating(vendorId, rating, review.trim());
            if (res.success) {
                setSubmittedSuccess(true);
                setTimeout(() => {
                    setSubmittedSuccess(false);
                    setReview('');
                    onClose();
                    if (onSuccess)
                        onSuccess();
                }, 1500);
            }
        }
        catch (err) {
            // Backend requires proximity alert within 2 hours
            if (err.statusCode === 403 || err.message?.includes('proximity alert')) {
                setErrorMessage('Community Review Rule: A vendor must have actually passed near your location within the last 2 hours before you can submit a rating.');
            }
            else {
                setErrorMessage(err.message || 'Unable to submit rating. Please try again.');
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!visible)
        return null;
    return (<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rate Vendor</Text>
              <Text style={styles.subtitle}>{vendorName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b"/>
            </TouchableOpacity>
          </View>

          {submittedSuccess ? (<View style={styles.successContainer}>
              <CheckCircle2 size={48} color="#059669"/>
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successText}>Your rating has been submitted to the community.</Text>
            </View>) : (<View style={styles.body}>
              {/* Star selector */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (<TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starTouch}>
                    <Star size={32} color={star <= rating ? '#f59e0b' : '#cbd5e1'} fill={star <= rating ? '#f59e0b' : 'transparent'}/>
                  </TouchableOpacity>))}
              </View>
              <Text style={styles.ratingText}>{rating} of 5 Stars</Text>

              {/* Review input */}
              <TextInput style={styles.textArea} placeholder="Optional: How was the freshness, pricing, or service?" placeholderTextColor="#94a3b8" multiline numberOfLines={3} value={review} onChangeText={setReview} maxLength={500}/>

              {errorMessage && (<View style={styles.errorBox}>
                  <AlertCircle size={16} color="#e11d48" style={{ marginTop: 2 }}/>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>)}

              {/* Action buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}>
                  {isSubmitting ? (<ActivityIndicator size="small" color="#fff"/>) : (<Text style={styles.submitText}>Submit Feedback</Text>)}
                </TouchableOpacity>
              </View>
            </View>)}
        </View>
      </View>
    </Modal>);
};
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 13,
        color: '#059669',
        fontWeight: '600',
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    body: {
        alignItems: 'center',
    },
    starRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 12,
    },
    starTouch: {
        padding: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 16,
    },
    textArea: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 13,
        color: '#0f172a',
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#f8fafc',
        marginBottom: 12,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        width: '100%',
    },
    errorText: {
        flex: 1,
        fontSize: 11,
        color: '#9f1239',
        lineHeight: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 8,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    submitBtn: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#059669',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    submitText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#059669',
        marginTop: 12,
    },
    successText: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
    },
});
