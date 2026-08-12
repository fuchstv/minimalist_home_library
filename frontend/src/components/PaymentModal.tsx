import React, { useState, useContext } from 'react';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: (message: string, feePaid: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
    const { user, csrfToken } = useContext(AuthContext);
    const [amount, setAmount] = useState<string>('10.00');
    const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'simulation'>('paypal');
    const [comment, setComment] = useState<string>(`10 Euro für Bibliothekskonto - ${user?.name || ''}`);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const res = await fetch(`${API_BASE_URL}/api/payments`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    payment_method: paymentMethod,
                    comment: comment
                }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                onPaymentSuccess(data.message, data.fee_paid || false);
                onClose();
            } else {
                setError(data.message || 'Fehler bei der Zahlungsverarbeitung.');
            }
        } catch (err) {
            logger.error('Payment Error:', err);
            setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayPalRedirect = () => {
        // Official SprachCafé PayPal Donation URL or custom checkout link
        window.open('https://www.paypal.com/donate/?hosted_button_id=SPRACHCAFE_LIBRARY', '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-fadeIn">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-outline-variant pb-4">
                    <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider mb-1">
                            Mitgliedsgebühr & Spende
                        </span>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">Bibliotheksbeitrag bezahlen</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-on-surface-variant hover:text-on-surface transition-colors text-2xl font-bold p-1"
                        title="Schließen"
                    >
                        &times;
                    </button>
                </div>

                {/* Notice Info Box */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">info</span>
                    <div className="text-body-sm space-y-1">
                        <p className="font-bold">Mitgliedsgebühr Offen (10,00 €)</p>
                        <p className="text-xs opacity-90">
                            Für die Nutzung der Bibliothek ist eine einmalige Registrierungsgebühr / Jahresbeitrag von <strong>10 Euro</strong> erforderlich.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-error/10 border border-error/30 text-error rounded-xl p-3 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                            Betrag in Euro (€)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.50"
                                min="1.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">€</span>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                            Zahlungsoption wählen
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('paypal')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                                    paymentMethod === 'paypal'
                                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                                        : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant'
                                }`}
                            >
                                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                <span className="text-xs">PayPal</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                                    paymentMethod === 'card'
                                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                                        : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant'
                                }`}
                            >
                                <span className="material-symbols-outlined text-2xl">credit_card</span>
                                <span className="text-xs">Kredit- / Debitkarte</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('simulation')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                                    paymentMethod === 'simulation'
                                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                                        : 'border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant'
                                }`}
                            >
                                <span className="material-symbols-outlined text-2xl">bolt</span>
                                <span className="text-xs">Sofort-Aktivierung</span>
                            </button>
                        </div>
                    </div>

                    {paymentMethod === 'paypal' && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
                            <span>Direkter SprachCafé PayPal-Spendenlink für 10 Euro:</span>
                            <button
                                type="button"
                                onClick={handlePayPalRedirect}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
                            >
                                <span>PayPal öffnen</span>
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                            </button>
                        </div>
                    )}

                    {/* Payment Comment Input */}
                    <div>
                        <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                            Kommentar zur Zahlung (für Buchhaltung)
                        </label>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="z. B. 10 Euro für Bibliothekskonto - Anna Kowalska"
                            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                        <p className="text-[11px] text-on-surface-variant mt-1">
                            Der Buchhalter von SprachCafé Polnisch sieht diesen Kommentar und schaltet nach Abgleich Ihr Konto frei.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors text-sm"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {loading ? (
                                <span>Verarbeite...</span>
                            ) : (
                                <>
                                    <span>Zahlung ({amount} €) absenden</span>
                                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
