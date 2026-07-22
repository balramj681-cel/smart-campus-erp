package com.smartcampus.erp.application.fee.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.PaymentMode;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class FeePaymentResponse {
    private UUID        id;
    private double      amount;
    private LocalDate   paymentDate;
    private PaymentMode paymentMode;
    private String      paymentModeDisplay;
    private String      transactionId;
    private String      receiptNumber;
    private String      remarks;
    private LocalDateTime createdAt;
}