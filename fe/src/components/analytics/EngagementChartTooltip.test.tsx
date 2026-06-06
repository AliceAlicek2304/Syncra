import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { EngagementChartTooltip, type MetricDef, type WeekRange } from "./EngagementChartTooltip"

const mockMetrics: MetricDef[] = [
  { key: "likes", label: "Likes", color: "#EF4444" },
  { key: "comments", label: "Comments", color: "#3B82F6" },
  { key: "shares", label: "Shares", color: "#8B5CF6" },
  { key: "saves", label: "Saves", color: "#F59E0B" },
  { key: "views", label: "Views", color: "#06B6D4" },
  { key: "impressions", label: "Impressions", color: "#10B981" },
  { key: "reach", label: "Reach", color: "#F97316" },
  { key: "clicks", label: "Clicks", color: "#6366F1" },
]

const mockLabels = ["May 8", "May 15"]
const mockWeekRanges: WeekRange[] = [
  { weekStart: new Date("2026-05-08"), weekEnd: new Date("2026-05-14") },
  { weekStart: new Date("2026-05-15"), weekEnd: new Date("2026-05-21") },
]

const mockRaw: Record<string, number[]> = {
  likes: [10, 20],
  comments: [5, 8],
  shares: [2, 3],
  saves: [1, 4],
  views: [100, 200],
  impressions: [500, 600],
  reach: [50, 80],
  clicks: [7, 12],
  posts: [3, 5],
}

describe("EngagementChartTooltip", () => {
  it("renders week range header", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("May 8 – May 14, 2026")).toBeDefined()
  })

  it("falls back to label when weekRange is missing", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={[]}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("May 8")).toBeDefined()
  })

  it("renders all metric rows", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("Likes")).toBeDefined()
    expect(screen.getByText("Comments")).toBeDefined()
    expect(screen.getByText("Shares")).toBeDefined()
    expect(screen.getByText("Saves")).toBeDefined()
    expect(screen.getByText("Views")).toBeDefined()
    expect(screen.getByText("Impressions")).toBeDefined()
    expect(screen.getByText("Reach")).toBeDefined()
    expect(screen.getByText("Clicks")).toBeDefined()
  })

  it("displays metric values with locale formatting", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("10")).toBeDefined()
    expect(screen.getByText("5")).toBeDefined()
    expect(screen.getByText("100")).toBeDefined()
    expect(screen.getByText("500")).toBeDefined()
  })

  it("shows correct values for second data index", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={1}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("20")).toBeDefined()
    expect(screen.getByText("8")).toBeDefined()
    expect(screen.getByText("200")).toBeDefined()
    expect(screen.getByText("600")).toBeDefined()
  })

  it("shows plural posts count", () => {
    render(
      <EngagementChartTooltip
        visible
        dataIndex={1}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("5 posts")).toBeDefined()
  })

  it("shows singular post count when posts is 1", () => {
    const singlePostRaw = {
      ...mockRaw,
      posts: [1, 0],
    }
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={singlePostRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("1 post")).toBeDefined()
  })

  it("shows '0 posts' when no posts", () => {
    const noPostRaw = {
      ...mockRaw,
      posts: [0, 0],
    }
    render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={noPostRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("0 posts")).toBeDefined()
  })

  it("applies hidden classes when not visible", () => {
    const { container } = render(
      <EngagementChartTooltip
        visible={false}
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain("opacity-0")
    expect(el.className).toContain("scale-95")
    expect(el.className).toContain("pointer-events-none")
  })

  it("applies visible classes when visible", () => {
    const { container } = render(
      <EngagementChartTooltip
        visible
        dataIndex={0}
        labels={mockLabels}
        raw={mockRaw}
        weekRanges={mockWeekRanges}
        metrics={mockMetrics}
      />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain("opacity-100")
    expect(el.className).toContain("scale-100")
  })
})
