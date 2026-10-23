"""Offline Skeleton v3 preflight. Never generates images or spends PixelLab credits."""
import argparse,json,math
from pathlib import Path

LABELS={'NOSE','NECK','RIGHT SHOULDER','RIGHT ELBOW','RIGHT ARM','LEFT SHOULDER','LEFT ELBOW','LEFT ARM','RIGHT HIP','RIGHT KNEE','RIGHT LEG','LEFT HIP','LEFT KNEE','LEFT LEG','RIGHT EYE','LEFT EYE','RIGHT EAR','LEFT EAR'}

def audit(request,grounded=False,north_forward=False):
    if not isinstance(request,dict):
        return {'passed':False,'violations':['Expected request object.'],'artistic_approval':False}
    violations=[];poses=request.get('keypoints');reference=request.get('first_frame_keypoints')
    if not isinstance(poses,list) or not 3<=len(poses)<=15:
        return {'passed':False,'violations':['Expected3–15 output poses.'],'artistic_approval':False}
    if not isinstance(reference,list):reference=[]
    valid=[]
    for name,pose in [('reference',reference)]+[(str(i),p) for i,p in enumerate(poses)]:
        if not isinstance(pose,list) or len(pose)!=18 or any(not isinstance(p,dict) or not isinstance(p.get('label'),str) for p in pose) or {p.get('label') for p in pose}!=LABELS:
            violations.append(name+': expected all18 unique joints.');continue
        pose_valid=True
        for joint in pose:
            if any(isinstance(joint.get(axis),bool) or not isinstance(joint.get(axis),(int,float)) or not math.isfinite(joint[axis]) or not 0<=joint[axis]<=1 for axis in ['x','y']):
                violations.append(name+': invalid normalized joint '+str(joint.get('label')));pose_valid=False
            if 'depth' in joint and (isinstance(joint['depth'],bool) or not isinstance(joint['depth'],(int,float)) or not math.isfinite(joint['depth']) or not 0<=joint['depth']<=255):
                violations.append(name+': invalid depth '+joint['label']);pose_valid=False
            if 'z_index' in joint and (isinstance(joint['z_index'],bool) or not isinstance(joint['z_index'],int)):
                violations.append(name+': invalid draw order '+joint['label']);pose_valid=False
        if not pose_valid:continue
        if north_forward:
            joints={j['label']:j for j in pose}
            torso=[joints[label] for label in ('NECK','RIGHT HIP','LEFT HIP')]
            arms=[joints[side+part] for side in ('RIGHT','LEFT') for part in (' ELBOW',' ARM')]
            if any('depth' not in j or 'z_index' not in j for j in torso+arms):
                violations.append(name+': explicit torso/forearm depth and order required.')
            else:
                for joint in arms:
                    if joint['depth']>=min(t['depth'] for t in torso) or joint['z_index']>=min(t['z_index'] for t in torso):
                        violations.append(name+': '+joint['label']+' must be behind torso anchors.')
        if name!='reference':valid.append({j['label']:j for j in pose})
    if north_forward and request.get('direction')!='north':violations.append('North-forward policy requires direction north.')
    if grounded and len(valid)==len(poses):
        for side in ['RIGHT LEG','LEFT LEG']:
            heights={p[side]['y'] for p in valid}
            if len(heights)>1:violations.append(side+': planted-ankle height varies across poses; review before spending.')
    return {'passed':not violations,'violations':violations,'frames':len(poses),'grounded_policy':grounded,'north_forward_policy':north_forward,'artistic_approval':False,'note':'Numerical input checks cannot certify occlusion, anatomy, generated foot position or fitted pieces.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('request',type=Path);parser.add_argument('--grounded',action='store_true');parser.add_argument('--north-forward',action='store_true');args=parser.parse_args()
    result=audit(json.loads(args.request.read_text(encoding='utf-8')),args.grounded,args.north_forward);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if result['passed'] else 1)
