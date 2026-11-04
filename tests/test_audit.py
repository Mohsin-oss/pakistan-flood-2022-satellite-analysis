import unittest

from src.audit import otsu


class OtsuTest(unittest.TestCase):
    def test_separated_classes(self):
        self.assertEqual(otsu([(-0.5, 10), (0, 0), (0.5, 10)]), 0)

    def test_degenerate_histogram(self):
        with self.assertRaises(ValueError):
            otsu([(0.5, 10)])


if __name__ == "__main__":
    unittest.main()
