/**
 * Biometric Authentication Service
 * Phase 3: Mobile-First Security Features
 */

import ReactNativeBiometrics from 'react-native-biometrics';
import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType: string;
  error?: string;
}

class BiometricAuthService {
  private biometrics: ReactNativeBiometrics;

  constructor() {
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const { available, biometryType, error } = await this.biometrics.isSensorAvailable();
      
      return {
        isAvailable: available,
        biometryType: biometryType || 'None',
        error: error
      };
    } catch (error) {
      return {
        isAvailable: false,
        biometryType: 'None',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create biometric keys for secure authentication
   */
  async createBiometricKeys(): Promise<{ success: boolean; publicKey?: string; error?: string }> {
    try {
      const { keysExist } = await this.biometrics.keysExist();
      
      if (keysExist) {
        await this.biometrics.deleteKeys();
      }

      const { publicKey } = await this.biometrics.createKeys();
      
      // Store the public key securely
      await EncryptedStorage.setItem('biometric_public_key', publicKey);
      
      return { success: true, publicKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create biometric keys'
      };
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateWithBiometrics(): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available'
        };
      }

      const { keysExist } = await this.biometrics.keysExist();
      
      if (!keysExist) {
        return {
          success: false,
          error: 'Biometric keys not found. Please set up biometric authentication.'
        };
      }

      // Create a challenge for authentication
      const challenge = this.generateChallenge();
      
      const { success, signature, error } = await this.biometrics.createSignature({
        promptMessage: 'Authenticate to access your exchange account',
        payload: challenge,
        cancelButtonText: 'Cancel'
      });

      if (success && signature) {
        // Verify the signature (would normally be done on server)
        const isValid = await this.verifySignature(challenge, signature);
        
        if (isValid) {
          return {
            success: true,
            biometricType: capabilities.biometryType
          };
        } else {
          return {
            success: false,
            error: 'Biometric verification failed'
          };
        }
      } else {
        return {
          success: false,
          error: error || 'Authentication cancelled'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Biometric authentication failed'
      };
    }
  }

  /**
   * Set up Face ID authentication
   */
  async setupFaceID(): Promise<BiometricAuthResult> {
    try {
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'Face ID is only available on iOS devices'
        };
      }

      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable || capabilities.biometryType !== 'FaceID') {
        return {
          success: false,
          error: 'Face ID not available on this device'
        };
      }

      const keyResult = await this.createBiometricKeys();
      
      if (!keyResult.success) {
        return {
          success: false,
          error: keyResult.error
        };
      }

      // Test Face ID authentication
      const authResult = await this.authenticateWithBiometrics();
      
      if (authResult.success) {
        await this.storeBiometricPreference('faceId', true);
        return {
          success: true,
          biometricType: 'FaceID'
        };
      } else {
        return authResult;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Face ID setup failed'
      };
    }
  }

  /**
   * Set up Touch ID / Fingerprint authentication
   */
  async setupTouchID(): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Fingerprint authentication not available on this device'
        };
      }

      if (Platform.OS === 'ios' && capabilities.biometryType !== 'TouchID') {
        return {
          success: false,
          error: 'Touch ID not available on this device'
        };
      }

      if (Platform.OS === 'android' && capabilities.biometryType !== 'Fingerprint') {
        return {
          success: false,
          error: 'Fingerprint authentication not available on this device'
        };
      }

      const keyResult = await this.createBiometricKeys();
      
      if (!keyResult.success) {
        return {
          success: false,
          error: keyResult.error
        };
      }

      // Test fingerprint authentication
      const authResult = await this.authenticateWithBiometrics();
      
      if (authResult.success) {
        await this.storeBiometricPreference('touchId', true);
        return {
          success: true,
          biometricType: Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint'
        };
      } else {
        return authResult;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Touch ID setup failed'
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.biometrics.deleteKeys();
      await EncryptedStorage.removeItem('biometric_public_key');
      await this.storeBiometricPreference('faceId', false);
      await this.storeBiometricPreference('touchId', false);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable biometric authentication'
      };
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const { keysExist } = await this.biometrics.keysExist();
      const publicKey = await EncryptedStorage.getItem('biometric_public_key');
      
      return keysExist && !!publicKey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's biometric preferences
   */
  async getBiometricPreferences(): Promise<{
    faceIdEnabled: boolean;
    touchIdEnabled: boolean;
    biometricType: string;
  }> {
    try {
      const faceIdEnabled = await EncryptedStorage.getItem('biometric_faceid_enabled') === 'true';
      const touchIdEnabled = await EncryptedStorage.getItem('biometric_touchid_enabled') === 'true';
      const capabilities = await this.checkBiometricCapabilities();
      
      return {
        faceIdEnabled,
        touchIdEnabled,
        biometricType: capabilities.biometryType
      };
    } catch (error) {
      return {
        faceIdEnabled: false,
        touchIdEnabled: false,
        biometricType: 'None'
      };
    }
  }

  // Private helper methods
  private generateChallenge(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async verifySignature(challenge: string, signature: string): Promise<boolean> {
    try {
      // In a real app, this would be verified on the server
      // For now, we'll just check if the signature exists
      return !!signature && signature.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async storeBiometricPreference(type: 'faceId' | 'touchId', enabled: boolean): Promise<void> {
    const key = type === 'faceId' ? 'biometric_faceid_enabled' : 'biometric_touchid_enabled';
    await EncryptedStorage.setItem(key, enabled.toString());
  }
}

export default new BiometricAuthService();