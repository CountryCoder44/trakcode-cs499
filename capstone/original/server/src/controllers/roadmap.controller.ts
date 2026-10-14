import { NextFunction, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { SkillRequest } from '../models/SkillRequest';

// ---- GET /roadmap (public) ----
export const listRoadmap: RequestHandler = async (req, res, next) => {
  try {
    const requests = await SkillRequest.find().sort({ votes: -1, createdAt: -1 });
    const viewerId = req.auth?.userId;

    res.json({
      requests: requests.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        votes: r.votes.length,
        votedByViewer: viewerId ? r.votes.some((v) => v.toString() === viewerId) : false,
        createdAt: r.createdAt,
        liveAt: r.liveAt ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /roadmap/request ----
const createRequestSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
});

export const createRequest: RequestHandler = async (req, res, next) => {
  try {
    const body = createRequestSchema.parse(req.body);
    const request = await SkillRequest.create({
      title: body.title,
      description: body.description,
      status: 'requested',
      votes: [req.auth!.userId],
    });

    res.status(201).json({
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status,
        votes: request.votes.length,
        createdAt: request.createdAt,
      },
    });
  } catch (err) {
    handleRoadmapError(err, res, next);
  }
};

// ---- POST /roadmap/:id/vote ----
export const voteRequest: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const request = await SkillRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Skill request not found' });
      return;
    }

    const alreadyVoted = request.votes.some((v) => v.toString() === userId);
    const updated = await SkillRequest.findByIdAndUpdate(
      request._id,
      alreadyVoted ? { $pull: { votes: userId } } : { $addToSet: { votes: userId } },
      { new: true }
    );

    res.json({ id: updated!.id, votes: updated!.votes.length, votedByViewer: !alreadyVoted });
  } catch (err) {
    next(err);
  }
};

function handleRoadmapError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  next(err);
}
