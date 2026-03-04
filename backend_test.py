#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Stumpr Application
Tests all authentication, patient management, LPPR search, sharing, and PDF export endpoints
"""

import requests
import sys
import json
from datetime import datetime
import time

class StumprAPITester:
    def __init__(self, base_url="https://prosthese-aide.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.patient_id = None
        self.share_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            self.failed_tests.append({"test": test_name, "error": details})

    def make_request(self, method, endpoint, data=None, headers=None, expect_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        
        # Default headers
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expect_status
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expect_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                return False, error_msg

        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, str(e)

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Check Endpoints...")
        
        # Test root endpoint
        success, response = self.make_request('GET', '')
        self.log_result("Root endpoint", success, response if not success else "")
        
        # Test health endpoint
        success, response = self.make_request('GET', 'health')
        self.log_result("Health endpoint", success, response if not success else "")

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique test user
        timestamp = int(time.time())
        test_user = {
            "prenom": "Jean",
            "nom": "Test",
            "email": f"jean.test.{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user, expect_status=200)
        
        if success:
            self.token = response.get('access_token')
            self.user_id = response.get('user', {}).get('id')
            self.log_result("User registration", True)
        else:
            self.log_result("User registration", False, response)
            
        return success

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        
        if not self.token:
            print("⚠️  Skipping login test - no registered user")
            return False
            
        # Try to get current user info to verify token works
        success, response = self.make_request('GET', 'auth/me')
        self.log_result("Get current user", success, response if not success else "")
        
        return success

    def test_lppr_search(self):
        """Test LPPR component search"""
        print("\n🔍 Testing LPPR Search...")
        
        # Test search with 'genou' as mentioned in requirements
        success, response = self.make_request('GET', 'lppr/search?q=genou')
        
        if success and isinstance(response, list):
            self.log_result("LPPR search (genou)", True)
            print(f"   Found {len(response)} results")
            if response:
                print(f"   Sample result: {response[0].get('nomenclature', 'N/A')}")
        else:
            self.log_result("LPPR search (genou)", False, response)
            
        # Test search with short query (should fail)
        success, response = self.make_request('GET', 'lppr/search?q=a', expect_status=422)
        self.log_result("LPPR search validation (short query)", success, response if not success else "")
        
        return True

    def test_patient_crud(self):
        """Test patient CRUD operations"""
        print("\n🔍 Testing Patient CRUD Operations...")
        
        if not self.token:
            print("⚠️  Skipping patient tests - no authentication")
            return False
            
        # Create patient data
        patient_data = {
            "prenom": "Marie",
            "nom": "Dupont",
            "date_naissance": "1985-06-15",
            "email": "marie.dupont@example.com",
            "telephone": "0123456789",
            "niveau_activite": "Actif",
            "niveau_amputation": "Tibiale (sous le genou)",
            "cote": "Gauche",
            "date_amputation": "2020-03-10",
            "cause": "Traumatique",
            "notes_moignon": "Moignon en bon état",
            "composants": [
                {
                    "code": "3279894",
                    "nomenclature": "Genou polycentriques",
                    "tarif": 1500.0,
                    "duree_ans": 3,
                    "categorie": "Genoux",
                    "application": "Amputation fémorale",
                    "date_prescription": "2024-01-15",
                    "prise_en_charge_complementaire": "Mutuelle",
                    "montant_rembourse": 1200.0,
                    "etat_composant": "Bon état",
                    "notes": "Composant principal"
                }
            ],
            "ortho_referent": "Dr. Martin",
            "cabinet_centre": "Centre Orthopédique Paris",
            "telephone_ortho": "0145678901",
            "medecin_prescripteur": "Dr. Leroy",
            "specialite_prescripteur": "Médecin MPR",
            "prochain_rdv": "2024-12-15",
            "notes_medicales": "Suivi régulier nécessaire",
            "activites": ["marche_courte", "courses", "conduite"]
        }
        
        # Test CREATE patient
        success, response = self.make_request('POST', 'patients', patient_data, expect_status=200)
        if success:
            self.patient_id = response.get('id')
            self.log_result("Create patient", True)
        else:
            self.log_result("Create patient", False, response)
            return False
            
        # Test GET patient by ID
        success, response = self.make_request('GET', f'patients/{self.patient_id}')
        self.log_result("Get patient by ID", success, response if not success else "")
        
        # Test GET all patients
        success, response = self.make_request('GET', 'patients')
        if success and isinstance(response, list):
            self.log_result("Get all patients", True)
            print(f"   Found {len(response)} patients")
        else:
            self.log_result("Get all patients", False, response)
            
        # Test UPDATE patient
        update_data = patient_data.copy()
        update_data['telephone'] = "0987654321"
        update_data['notes_medicales'] = "Notes mises à jour"
        
        success, response = self.make_request('PUT', f'patients/{self.patient_id}', update_data)
        self.log_result("Update patient", success, response if not success else "")
        
        return True

    def test_share_functionality(self):
        """Test patient sharing functionality"""
        print("\n🔍 Testing Share Functionality...")
        
        if not self.patient_id:
            print("⚠️  Skipping share tests - no patient created")
            return False
            
        # Test CREATE share link
        success, response = self.make_request('POST', f'patients/{self.patient_id}/share', {})
        if success:
            self.share_id = response.get('share_id')
            self.log_result("Create share link", True)
            print(f"   Share ID: {self.share_id}")
            print(f"   Expires: {response.get('expires_at')}")
        else:
            self.log_result("Create share link", False, response)
            return False
            
        # Test ACCESS shared patient
        success, response = self.make_request('GET', f'shared/{self.share_id}')
        self.log_result("Access shared patient", success, response if not success else "")
        
        # Test invalid share ID
        success, response = self.make_request('GET', 'shared/invalid-id', expect_status=404)
        self.log_result("Invalid share ID handling", success, response if not success else "")
        
        return True

    def test_pdf_export(self):
        """Test PDF export functionality"""
        print("\n🔍 Testing PDF Export...")
        
        if not self.patient_id:
            print("⚠️  Skipping PDF test - no patient created")
            return False
            
        # Test PDF export (expect binary response)
        url = f"{self.base_url}/patients/{self.patient_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.log_result("PDF export", True)
                print(f"   PDF size: {len(response.content)} bytes")
            else:
                self.log_result("PDF export", False, f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                
        except Exception as e:
            self.log_result("PDF export", False, str(e))
            
        return True

    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🔍 Testing Error Handling...")
        
        # Test unauthorized access
        old_token = self.token
        self.token = "invalid-token"
        success, response = self.make_request('GET', 'auth/me', expect_status=401)
        self.log_result("Unauthorized access handling", success, response if not success else "")
        self.token = old_token
        
        # Test non-existent patient
        success, response = self.make_request('GET', 'patients/non-existent-id', expect_status=404)
        self.log_result("Non-existent patient handling", success, response if not success else "")
        
        # Test invalid patient data
        invalid_data = {"prenom": "", "nom": "", "email": "invalid-email"}
        success, response = self.make_request('POST', 'patients', invalid_data, expect_status=422)
        self.log_result("Invalid patient data handling", success, response if not success else "")

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.patient_id:
            success, response = self.make_request('DELETE', f'patients/{self.patient_id}')
            self.log_result("Delete test patient", success, response if not success else "")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Stumpr API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run tests in order
        self.test_health_check()
        
        if self.test_user_registration():
            self.test_user_login()
            self.test_lppr_search()
            
            if self.test_patient_crud():
                self.test_share_functionality()
                self.test_pdf_export()
                
            self.test_error_handling()
            self.cleanup()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['error']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = StumprAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())