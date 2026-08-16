import { withAuth } from '@/lib/apiAuth';
import { uploadMedia } from '@/lib/upload';

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } }, // audio recitations can be a few MB
};

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { dataUri } = req.body || {};
  if (!dataUri) return res.status(400).json({ error: 'dataUri is required' });
  try {
    const { url } = await uploadMedia(dataUri, 'exam-portal/questions');
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}, ['TEACHER']);
