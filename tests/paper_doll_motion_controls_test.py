"""Use actual production-study controls to check the offline pre-spend guard."""
import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from paper_doll_motion_controls import audit
FOLDER=ROOT/'pixellab-pip-generations/paper-doll-bento-directions-20261021'
def request(d):return json.loads((FOLDER/d/'request.json').read_text())
class Controls(unittest.TestCase):
    def test_west_is_grounded(self):self.assertTrue(audit(request('west'),True)['passed'])
    def test_east_existing_error_is_detected(self):
        result=audit(request('east'),True);self.assertFalse(result['passed']);self.assertTrue(any('ankle' in x for x in result['violations']))
    def test_occlusion_needs_visual_review(self):
        self.assertTrue(audit(request('north'),True)['passed']);self.assertFalse(json.loads((FOLDER/'reviews.json').read_text(encoding='utf-8'))['north']['body_motion_gate_passed'])
    def test_bad_coordinates_rejected(self):
        for bad in [float('nan'),float('inf'),True,-.1,1.1]:
            data=copy.deepcopy(request('west'));data['keypoints'][0][0]['x']=bad;self.assertFalse(audit(data)['passed'])
    def test_missing_and_duplicate_joints_rejected(self):
        data=request('west');data['keypoints'][0][1]=dict(data['keypoints'][0][0]);self.assertFalse(audit(data)['passed'])
    def test_north_old_near_arm_is_detected(self):
        result=audit(request('north'),True,True)
        self.assertFalse(result['passed'])
        self.assertTrue(any('LEFT ARM' in error for error in result['violations']))
    def test_corrected_guides_pass_both_policies(self):
        folder=FOLDER.parent/'paper-doll-bento-repair-20261022'
        for direction in ('north','east'):
            data=json.loads((folder/direction/'request.json').read_text())
            self.assertTrue(audit(data,True,direction=='north')['passed'])
    def test_invalid_structures_fail_without_crashing(self):
        for value in [None,[],17]:self.assertFalse(audit(value)['passed'])
        for value in [[],{},None]:
            data=request('west');data['keypoints'][0][0]['label']=value
            self.assertFalse(audit(data)['passed'])
    def test_depth_and_order_validate(self):
        for field,value in [('depth',float('nan')),('depth',256),('z_index',True),('z_index',1.5)]:
            data=request('north');data['keypoints'][0][0][field]=value
            self.assertFalse(audit(data)['passed'])
if __name__=='__main__':unittest.main()
