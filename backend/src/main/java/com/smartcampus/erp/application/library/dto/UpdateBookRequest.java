package com.smartcampus.erp.application.library.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateBookRequest {

    @NotBlank @Size(max = 250)
    private String title;

    @NotBlank @Size(max = 200)
    private String author;

    @NotBlank @Size(max = 30)
    private String isbn;

    private String publisher;
    private String category;
    private String edition;
    private Integer publishedYear;
    private String rackNumber;
    private String description;

    @NotNull @Min(0)
    private Integer totalCopies;

    private boolean active = true;
}