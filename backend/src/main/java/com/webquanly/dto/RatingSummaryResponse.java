package com.webquanly.dto;

public class RatingSummaryResponse {
    private Double average;
    private Long total;
    private Integer userScore;

    public Double getAverage() { return average; }
    public void setAverage(Double average) { this.average = average; }

    public Long getTotal() { return total; }
    public void setTotal(Long total) { this.total = total; }

    public Integer getUserScore() { return userScore; }
    public void setUserScore(Integer userScore) { this.userScore = userScore; }
}
