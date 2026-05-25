package service

import (
	"errors"
	"testing"

	"unisearch/model"
)

type secretManagerTestAdapter struct {
	getSecret func(name string) (string, error)
}

func (s *secretManagerTestAdapter) GetSecret(name string) (string, error) {
	return s.getSecret(name)
}

func (s *secretManagerTestAdapter) SetSecret(name string, value string, secretType model.SecretType, description string) error {
	return nil
}

func (s *secretManagerTestAdapter) RotateSecret(name string, newValue string) error {
	return nil
}

func (s *secretManagerTestAdapter) DeleteSecret(name string) error {
	return nil
}

func (s *secretManagerTestAdapter) ListSecrets() ([]model.Secret, error) {
	return nil, nil
}

func TestGetTMDBReadAccessTokenReturnsStoredSecret(t *testing.T) {
	originalManager := GetGlobalSecretManager()
	defer SetGlobalSecretManager(originalManager)

	SetGlobalSecretManager(&secretManagerTestAdapter{
		getSecret: func(name string) (string, error) {
			if name != SecretNameTMDBReadAccessKey {
				t.Fatalf("expected %s, got %s", SecretNameTMDBReadAccessKey, name)
			}
			return "tmdb-secret-token", nil
		},
	})

	token, err := GetTMDBReadAccessToken()
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if token != "tmdb-secret-token" {
		t.Fatalf("expected tmdb-secret-token, got %q", token)
	}
}

func TestGetTMDBReadAccessTokenReturnsErrorWhenSecretMissing(t *testing.T) {
	originalManager := GetGlobalSecretManager()
	defer SetGlobalSecretManager(originalManager)

	SetGlobalSecretManager(&secretManagerTestAdapter{
		getSecret: func(name string) (string, error) {
			return "", errors.New("密钥不存在")
		},
	})

	if _, err := GetTMDBReadAccessToken(); err == nil {
		t.Fatal("expected error when secret is missing")
	}
}
