"""Explicit flat PNG dependencies; never export a generation directory wholesale."""
import re


def pack_sources(*manifests):
    files = set()
    for manifest in manifests:
        for piece in manifest['pieces']:
            for clip in piece['animations'].values():
                files.add(clip['url'])
                files.update(source['url'] for source in clip.get('sources', {}).values())
    if any(not isinstance(name, str) or not re.fullmatch(r'[a-z0-9-]+\.png', name) for name in files):
        raise ValueError('Unsafe Paper Doll asset path')
    return files
