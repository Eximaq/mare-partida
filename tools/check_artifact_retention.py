"""Validate storage policy without running gameplay or uploading artifacts."""
from pathlib import Path
import unittest
import yaml

POLICY = "failure() || github.event_name == 'workflow_dispatch' || contains(github.event.pull_request.labels.*.name, 'preserve-evidence')"

class ArtifactPolicy(unittest.TestCase):
    def test_all_diagnostic_uploads_are_bounded_and_explicit(self):
        count = 0
        for path in Path('.github/workflows').glob('*.yml'):
            workflow = yaml.load(path.read_text(encoding='utf-8'), Loader=yaml.BaseLoader)
            for job in workflow.get('jobs', {}).values():
                for step in job.get('steps', []):
                    if step.get('uses', '').startswith('actions/upload-artifact@'):
                        count += 1
                        with self.subTest(file=str(path), artifact=step.get('with', {}).get('name')):
                            self.assertEqual(step['with']['retention-days'], '3')
                            self.assertIn(step.get('if'), ['failure()', POLICY])
        self.assertGreater(count, 0)

if __name__ == '__main__':
    unittest.main()
