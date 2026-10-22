"""Offline Skeleton v3 preflight. Never generates images or spends PixelLab credits."""
import argparse,json,math
from pathlib import Path

LABELS={'NOSE','NECK','RIGHT SHOULDER','RIGHT ELBOW','RIGHT ARM','LEFT SHOULDER','LEFT ELBOW','LEFT ARM','RIGHT HIP','RIGHT KNEE','RIGHT LEG','LEFT HIP','LEFT KNEE','LEFT LEG','RIGHT EYE','LEFT EYE','RIGHT EAR','LEFT EAR'}

def audit(request,grounded=False):
    violations=[];poses=request.get('keypoints');reference=request.get('first_frame_keypoints')
    if not isinstance(poses,list) or not 3<=len(poses)<=15:
        return {'passed':False,'violations':['Expected3–15 output poses.'],'artistic_approval':False}
    if not isinstance(reference,list):reference=[]
    valid=[]
    for name,pose in [('reference',reference)]+[(str(i),p) for i,p in enumerate(poses)]:
        if not isinstance(pose,list) or len(pose)!=18 or any(not isinstance(p,dict) for p in pose) or {p.get('label') for p in pose}!=LABELS:
            violations.append(name+': expected all18 unique joints.');continue
        for joint in pose:
            if any(isinstance(joint.get(axis),bool) or not isinstance(joint.get(axis),(int,float)) or not math.isfinite(joint[axis]) or not 0<=joint[axis]<=1 for axis in ['x','y']):
                violations.append(name+': invalid normalized joint '+str(joint.get('label')))
        if name!='reference':valid.append({j['label']:j for j in pose})
    if grounded and len(valid)==len(poses):
        for side in ['RIGHT LEG','LEFT LEG']:
            heights={p[side]['y'] for p in valid}
            if len(heights)>1:violations.append(side+': planted-ankle height varies across poses; review before spending.')
    return {'passed':not violations,'violations':violations,'frames':len(poses),'grounded_policy':grounded,'artistic_approval':False,'note':'Numerical input checks cannot certify occlusion, anatomy, generated foot position or fitted pieces.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('request',type=Path);parser.add_argument('--grounded',action='store_true');args=parser.parse_args()
    result=audit(json.loads(args.request.read_text(encoding='utf-8')),args.grounded);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if result['passed'] else 1)
