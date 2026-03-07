import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import Logo from './Logo';

interface PrivacyPolicyProps {
    onBack: () => void;
    darkMode?: boolean;
}

export default function PrivacyPolicy({ onBack, darkMode }: PrivacyPolicyProps) {
    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                        <Logo />
                        <span className="text-xl font-bold font-mono">Pluto</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">1. Non-Custodial Nature</h2>
                        <p>
                            Pluto Wallet is a non-custodial cryptocurrency wallet. This means that <strong>we do not have access to your private keys, seed phrases, or funds.</strong> Your private keys are generated locally on your device, encrypted, and never transmitted to our servers or any third-party. You are solely responsible for securely storing your seed phrase. If you lose your seed phrase, we cannot recover your funds.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">2. Data We Collect</h2>
                        <p>
                            We prioritize your privacy and collect the absolute minimum data required to provide and improve our services:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Local Storage Data:</strong> Application settings (like dark mode preference), cached cryptocurrency prices, and encrypted wallet data are stored locally on your device or automatically synchronized via our infrastructure. This data remains fully encrypted and unintelligible to us.</li>
                            <li><strong>Opt-In Synchronization (Supabase):</strong> If you utilize cloud synchronization, your encrypted wallet structures and transaction history are synchronized to ensure cross-platform availability. We cannot decrypt or view the contents of your wallet, balances, or private keys.</li>
                            <li><strong>Analytics and Crash Logs:</strong> We may collect anonymized telemetry data (such as app performance metrics or crash instances) to identify bugs and improve performance. This data does not contain any personally identifiable information (PII) or wallet addresses.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">3. Third-Party Services</h2>
                        <p>
                            To provide a comprehensive experience, we integrate with specific third-party providers. Their processing of data is subject to their respective privacy policies:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>CoinGecko:</strong> We fetch real-time cryptocurrency market data and prices from the CoinGecko API.</li>
                            <li><strong>Fiat On-Ramps:</strong> If you purchase cryptocurrency using our application, integrations like MoonPay, Transak, and Coinbase may collect necessary KYC and payment information. We do not process or store this payment data.</li>
                            <li><strong>RPC Providers:</strong> We connect to public Remote Procedure Call (RPC) nodes to broadcast your transactions to the respective blockchains. These nodes may temporarily register the broadcasting IP address.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">4. Data Security</h2>
                        <p>
                            All sensitive wallet material, including your mnemonic phrase and private keys, is encrypted locally on your device using industry-standard cryptography before ever being written to persistent storage. It is your responsibility to secure your device with a passcode or biometric authentication.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">5. Data Retention and Deletion</h2>
                        <p>
                            Because your keys and primary data reside locally on your device, you have complete control over it. You can delete all your user data by clearing your app data, clearing browser cache in the web version, or utilizing the "Clear Local Storage" feature within the app. If you use our cloud sync feature, you may request the deletion of your encrypted synced data from our servers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">6. Changes to this Privacy Policy</h2>
                        <p>
                            We reserve the right to update or change our Privacy Policy at any time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">7. Contact Us</h2>
                        <p>
                            If you have any questions or concerns regarding this Privacy Policy or our data practices, please contact us at:
                            <br />
                            <strong>Email:</strong> privacy@plutowallet.app
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
